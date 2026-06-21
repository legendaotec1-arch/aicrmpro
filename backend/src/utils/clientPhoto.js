const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { uploadsDir } = require('../config/paths');
const { normalizeChannel } = require('./clients');

const IMAGE_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function extFromUrl(url) {
  try {
    const p = new URL(url).pathname.toLowerCase();
    if (p.endsWith('.png')) return '.png';
    if (p.endsWith('.webp')) return '.webp';
    if (p.endsWith('.gif')) return '.gif';
    if (p.endsWith('.jpeg') || p.endsWith('.jpg')) return '.jpg';
  } catch (_) {
    /* ignore */
  }
  return '.jpg';
}

async function downloadPhotoToUploads(sourceUrl) {
  if (!isHttpUrl(sourceUrl)) return null;

  const res = await axios.get(sourceUrl, {
    responseType: 'arraybuffer',
    timeout: 15000,
    maxContentLength: 5 * 1024 * 1024,
    headers: { Accept: 'image/*' }
  });

  const contentType = res.headers['content-type']?.split(';')[0]?.trim();
  const ext = IMAGE_EXT[contentType] || extFromUrl(sourceUrl);
  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(uploadsDir, filename);

  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(res.data));

  return `/uploads/${filename}`;
}

async function fetchTelegramProfilePhotoUrl(telegramUserId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !telegramUserId) return null;

  const base = `https://api.telegram.org/bot${token}`;
  const photosRes = await axios.get(`${base}/getUserProfilePhotos`, {
    params: { user_id: telegramUserId, limit: 1 },
    timeout: 10000
  });

  const photos = photosRes.data?.result?.photos;
  if (!photos?.length) return null;

  const sizes = photos[0];
  const largest = sizes[sizes.length - 1];
  if (!largest?.file_id) return null;

  const fileRes = await axios.get(`${base}/getFile`, {
    params: { file_id: largest.file_id },
    timeout: 10000
  });
  const filePath = fileRes.data?.result?.file_path;
  if (!filePath) return null;

  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

async function fetchMaxProfilePhotoUrl(maxUserId) {
  const token = process.env.MAX_BOT_TOKEN || process.env.BOT_TOKEN;
  const apiUrl = (process.env.MAX_API_URL || 'https://platform-api.max.ru').replace(/\/$/, '');
  if (!token || !maxUserId) return null;

  const endpoints = [
    `${apiUrl}/users/${maxUserId}`,
    `${apiUrl}/chats/${maxUserId}`
  ];

  for (const url of endpoints) {
    try {
      const res = await axios.get(url, {
        headers: { Authorization: token },
        timeout: 10000
      });
      const data = res.data?.user || res.data;
      const photo = data?.full_avatar_url || data?.avatar_url;
      if (isHttpUrl(photo)) return photo;
    } catch (_) {
      /* try next */
    }
  }
  return null;
}

async function resolveMessengerPhotoUrl(channel, messengerUserId, directUrl) {
  if (isHttpUrl(directUrl)) return directUrl.trim();
  const messenger = normalizeChannel(channel);
  if (messenger === 'telegram') {
    return fetchTelegramProfilePhotoUrl(messengerUserId);
  }
  if (messenger === 'max') {
    return fetchMaxProfilePhotoUrl(messengerUserId);
  }
  return null;
}

async function applyClientPhoto(clientId, { channel, messengerUserId, photoUrl } = {}) {
  if (!clientId) return null;

  const remoteUrl = await resolveMessengerPhotoUrl(channel, messengerUserId, photoUrl);
  if (!remoteUrl) return null;

  try {
    const localPath = await downloadPhotoToUploads(remoteUrl);
    if (!localPath) return null;

    await db.query('UPDATE clients SET photo_url = $1 WHERE id = $2', [localPath, clientId]);
    return localPath;
  } catch (err) {
    console.error('applyClientPhoto:', err.message);
    return null;
  }
}

/** Не блокирует ответ API */
function scheduleClientPhotoSync(clientId, options) {
  if (!clientId) return;
  setImmediate(() => {
    applyClientPhoto(clientId, options).catch((err) => {
      console.error('scheduleClientPhotoSync:', err.message);
    });
  });
}

module.exports = {
  applyClientPhoto,
  scheduleClientPhotoSync,
  resolveMessengerPhotoUrl,
  downloadPhotoToUploads
};

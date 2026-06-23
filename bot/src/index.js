require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { requireInternalSecret, internalAuthHeaders } = require('./internalAuth');
const { appendDeepLinkAuthParams } = require('./clientDeepLink');

const app = express();
app.use(cors());
app.use(express.json());

const MAX_API_URL = (process.env.MAX_API_URL || 'https://platform-api.max.ru').replace(/\/$/, '');
const BOT_TOKEN = process.env.MAX_BOT_TOKEN || process.env.BOT_TOKEN;
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const API_BASE = resolveApiBase(BACKEND_URL, PUBLIC_URL);
const WEBHOOK_SECRET = process.env.MAX_WEBHOOK_SECRET || '';
const WEBHOOK_URL = process.env.MAX_WEBHOOK_URL || '';
const PORT = process.env.PORT || 3001;

function resolveApiBase(backendUrl, publicUrl) {
  if (process.env.BOT_API_URL) return process.env.BOT_API_URL.replace(/\/$/, '');
  if (/^https?:\/\/backend(?::|$)/i.test(backendUrl) && publicUrl) return publicUrl;
  return backendUrl;
}

const lastMasterByUser = new Map();
// Дедупликация webhook от MAX (они дублируют bot_started)
const recentWebhookEvents = new Map();

if (!BOT_TOKEN) {
  console.error('MAX_BOT_TOKEN не задан');
  process.exit(1);
}

const api = axios.create({
  baseURL: MAX_API_URL,
  headers: { Authorization: BOT_TOKEN },
  timeout: 20000
});

function encodeMasterId(masterId) {
  return Buffer.from(String(masterId)).toString('base64');
}

function buildBookingUrl(masterIdEncoded, userId, extra = {}) {
  const params = new URLSearchParams({ ch: 'max' });
  if (userId) params.set('uid', String(userId));
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  if (userId) {
    appendDeepLinkAuthParams(params, { channel: 'max', userId: String(userId), masterIdEncoded });
  }
  return `${PUBLIC_URL}/m/${masterIdEncoded}?${params.toString()}`;
}

function absoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${PUBLIC_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncateText(text, max = 600) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trim()}…`;
}

function inlineKeyboard(buttonRows) {
  // MAX API: inlineKeyboard принимает массив строк кнопок
  // Каждая кнопка — объект с type, text, и параметрами
  return buttonRows;
}

function linkBtn(text, url) {
  // MAX: type: 'link' с полем 'url'
  return { type: 'link', text, url };
}

function callbackBtn(text, payload) {
  return { type: 'callback', text, payload };
}

function bookingKeyboard(url, encoded) {
  const rows = [[linkBtn('Записаться', url)]];
  if (encoded) rows.push([callbackBtn('Мои записи', `my_bookings:${encoded}`)]);
  return rows;
}

function bookingOnlyKeyboard(url) {
  return [[linkBtn('Записаться', url)]];
}

function appointmentKeyboard(apt, userId, fallbackMasterIdEncoded) {
  const encoded = fallbackMasterIdEncoded || encodeMasterId(apt.master_id);
  const rescheduleUrl = buildBookingUrl(encoded, userId, {
    tab: 'booking',
    reschedule: apt.id
  });
  return [
    [linkBtn('Перенести запись', rescheduleUrl)],
    [callbackBtn('Отменить запись', `cancel_apt:${apt.id}`)]
  ];
}

function formatMasterCard(card) {
  const lines = [`✨ ${card.title}`];
  const desc = truncateText(card.description, 600);
  if (desc) lines.push('', `🛠 ${desc}`);
  lines.push(
    '',
    '👇 Что можно сделать:',
    '📅 Для записи нажмите «Записаться».',
    '🗓 Посмотреть ваши записи — «Мои записи».'
  );
  return lines.join('\n');
}

function maxUserIdFrom(user) {
  return user?.user_id?.toString() || user?.id?.toString() || null;
}

function maxPhotoFrom(user) {
  return user?.full_avatar_url || user?.avatar_url || null;
}

function messageText(message) {
  return message?.body?.text || message?.text || '';
}

function messageUserId(message) {
  const sender = message?.sender || message?.from;
  return maxUserIdFrom(sender) || message?.user_id?.toString();
}

function parseStartRef(payloadOrText) {
  if (!payloadOrText) return null;
  const raw = String(payloadOrText).trim();
  // MAX может прислать просто encoded ID или ref_<id>
  if (raw.startsWith('ref_')) return raw.replace(/^ref_/, '');
  // Также может быть /start <payload>
  const parts = raw.split(/\s+/);
  if (parts[0] === '/start' && parts[1]?.startsWith('ref_')) {
    return parts[1].replace(/^ref_/, '');
  }
  // Или просто base64 ID без префикса — попробуем декодировать
  if (parts[0] === '/start' && parts[1]) {
    return parts[1];
  }
  return null;
}

async function fetchMasterCard(masterIdEncoded) {
  const res = await axios.get(`${API_BASE}/api/master/${masterIdEncoded}`);
  const master = res.data?.master || {};
  return {
    title:
      master.display_title
      || (master.salon_name?.trim() ? master.salon_name.trim() : [master.name, master.last_name].filter(Boolean).join(' '))
      || 'Мастер',
    description: master.description || '',
    photoUrl: absoluteUrl(master.logo_url)
  };
}

async function syncClientAvatar({ userId, photoUrl, name }) {
  if (!userId) return;
  try {
    await axios.post(
      `${API_BASE}/api/client/sync-avatar`,
      { channel: 'max', userId: String(userId), photoUrl: photoUrl || undefined, name },
      { timeout: 15000, headers: internalAuthHeaders() }
    );
  } catch (err) {
    console.error('MAX sync-avatar:', err.response?.data || err.message);
  }
}

async function sendMaxMessage(userId, text, keyboardRows = null, options = {}) {
  const body = {
    text,
    format: options.format || 'plain',
    notify: options.notify !== false
  };
  if (keyboardRows?.length) {
    body.attachments = [{ type: 'inline_keyboard', payload: { buttons: keyboardRows } }];
  }
  await api.post('/messages', body, { params: { user_id: userId } });
}

async function sendMaxImageByUrl(userId, imageUrl, caption = '', keyboardRows = null) {
  let retries = 3;
  while (retries > 0) {
    try {
      // 1) получаем URL для загрузки
      const uploadMeta = await api.post('/uploads', null, { params: { type: 'image' } });
      const uploadUrl = uploadMeta.data?.url;
      if (!uploadUrl) {
        console.error('MAX upload: no url in response', uploadMeta.data);
        return false;
      }

      // 2) скачиваем изображение мастера
      const img = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 20000
      });
      const contentType = img.headers['content-type'] || 'image/jpeg';

      // 3) загружаем через multipart/form-data с полем 'data' + Authorization
      const FormData = require('form-data');
      const form = new FormData();
      form.append('data', img.data, {
        filename: 'photo.jpg',
        contentType
      });

      const uploadRes = await axios.post(uploadUrl, form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': BOT_TOKEN
        },
        timeout: 30000
      });
      // Для image токен возвращается в photos: { "<base64_key>": { token: "..." } }
      let uploadToken = uploadRes.data?.token || uploadRes.data?.id;
      if (!uploadToken && uploadRes.data?.photos) {
        const photoKeys = Object.keys(uploadRes.data.photos);
        if (photoKeys.length > 0) {
          uploadToken = uploadRes.data.photos[photoKeys[0]]?.token;
        }
      }
      if (!uploadToken) {
        console.error('MAX upload: no token in response after upload', JSON.stringify(uploadRes.data).slice(0, 300));
        return false;
      }

      // 4) отправляем сообщение с фото + опционально кнопками
      const body = {
        text: caption || '',
        attachments: [
          { type: 'image', payload: { token: uploadToken } }
        ]
      };
      if (keyboardRows?.length) {
        body.attachments.push({ type: 'inline_keyboard', payload: { buttons: keyboardRows } });
      }
      await api.post('/messages', body, { params: { user_id: userId } });
      console.log('MAX image sent successfully, token:', uploadToken);
      return true;
    } catch (err) {
      console.error(`MAX send image attempt failed (${retries} left):`, err.response?.data || err.message);
      retries--;
      if (retries > 0) await new Promise(r => setTimeout(r, 500));
    }
  }
  return false;
}

async function answerCallback(callbackId, notification) {
  if (!callbackId) return;
  const body = notification ? { notification } : {};
  await api.post('/answers', body, { params: { callback_id: callbackId } });
}

async function fetchAppointments(userId) {
  const res = await axios.get(`${API_BASE}/api/client/my/${userId}`, {
    params: { channel: 'max' },
    headers: internalAuthHeaders()
  });
  return res.data;
}

async function sendMaxCardWithPhoto(userId, card, url) {
  // 1) Загружаем фото
  const uploadMeta = await api.post('/uploads', null, { params: { type: 'image' } });
  const uploadUrl = uploadMeta.data?.url;
  if (!uploadUrl) {
    await sendMaxMessage(userId, formatMasterCard(card), bookingKeyboard(url, card.encoded));
    return;
  }

  const img = await axios.get(card.photoUrl, {
    responseType: 'arraybuffer',
    timeout: 20000
  });
  const contentType = img.headers['content-type'] || 'image/jpeg';

  const FormData = require('form-data');
  const form = new FormData();
  form.append('data', img.data, { filename: 'photo.jpg', contentType });

  const uploadRes = await axios.post(uploadUrl, form, {
    headers: { ...form.getHeaders(), 'Authorization': BOT_TOKEN },
    timeout: 30000
  });

  let uploadToken = uploadRes.data?.token || uploadRes.data?.id;
  if (!uploadToken && uploadRes.data?.photos) {
    const photoKeys = Object.keys(uploadRes.data.photos);
    if (photoKeys.length > 0) {
      uploadToken = uploadRes.data.photos[photoKeys[0]]?.token;
    }
  }
  if (!uploadToken) {
    await sendMaxMessage(userId, formatMasterCard(card), bookingKeyboard(url, card.encoded));
    return;
  }

  // 2) Отправляем ОДНО сообщение: текст + фото + кнопки
  const text = formatMasterCard(card);
  const keyboardRows = bookingKeyboard(url, card.encoded);

  const body = {
    text,
    attachments: [
      { type: 'image', payload: { token: uploadToken } },
      { type: 'inline_keyboard', payload: { buttons: keyboardRows } }
    ]
  };

  console.log('MAX sending ONE message with photo+text+buttons');
  await api.post('/messages', body, { params: { user_id: userId } });
  console.log('MAX: sent photo+text+buttons in ONE message');
}

async function replyMasterCard(userId, encoded, user) {
  const url = buildBookingUrl(encoded, userId);
  lastMasterByUser.set(userId, encoded);
  syncClientAvatar({ userId, photoUrl: maxPhotoFrom(user), name: user?.name }).catch(() => {});

  let card;
  try {
    card = await fetchMasterCard(encoded);
    card.encoded = encoded;
    console.log('replyMasterCard fetched:', { title: card.title, description: card.description?.slice(0, 100), hasPhoto: !!card.photoUrl });
  } catch (err) {
    console.error('MAX fetch master card error:', err.message);
    await sendMaxMessage(
      userId,
      'Запись к мастеру\n\nДля записи нажмите кнопку «Записаться».',
      bookingKeyboard(url, encoded)
    );
    return;
  }

  if (card.photoUrl) {
    try {
      await sendMaxCardWithPhoto(userId, card, url);
      return;
    } catch (photoErr) {
      console.error('MAX photo send error:', photoErr.message);
    }
  }

  await sendMaxMessage(userId, formatMasterCard(card), bookingKeyboard(url, encoded));
}

async function replyMyBookings(userId, masterIdEncoded = null) {
  const bookingUrl = masterIdEncoded ? buildBookingUrl(masterIdEncoded, userId) : null;
  try {
    const appointments = await fetchAppointments(userId);
    if (!appointments.length) {
      await sendMaxMessage(
        userId,
        'У вас пока нет записей.\n\nНажмите «Записаться», чтобы выбрать услугу и удобное время.',
        bookingUrl ? bookingOnlyKeyboard(bookingUrl) : null
      );
      return;
    }
    await sendMaxMessage(userId, 'Ваши записи:');
    for (const apt of appointments) {
      const date = new Date(apt.appointment_time).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
      const text = `🧾 ${escapeHtml(apt.service_name)}\n🕒 ${date}\n📍 ${escapeHtml(apt.address || '—')}`;
      await sendMaxMessage(userId, text, appointmentKeyboard(apt, userId, masterIdEncoded));
    }
  } catch (err) {
    console.error(err);
    await sendMaxMessage(userId, 'Ошибка при загрузке записей');
  }
}

async function cancelAppointment(userId, appointmentId) {
  await axios.post(`${API_BASE}/api/client/cancel/${appointmentId}`, {
    channel: 'max',
    userId
  }, { headers: internalAuthHeaders() });
}

async function relayClientMessageToSalonChat({ userId, userName, text }) {
  const encodedMasterId = lastMasterByUser.get(userId);
  if (!encodedMasterId) return false;

  try {
    await axios.post(`${API_BASE}/api/client/${encodedMasterId}/chat`, {
      channel: 'max',
      userId,
      maxUserId: userId,
      name: userName || 'Клиент',
      body: text
    }, { headers: internalAuthHeaders() });
    return true;
  } catch (err) {
    console.error('MAX relay chat error:', err.response?.data || err.message);
    return false;
  }
}

async function handleBotStarted(update) {
  const user = update.user;
  const userId = maxUserIdFrom(user) || update.chat_id?.toString();
  if (!userId) return;

  // start_payload может быть JSON строкой — попробуем распарсить
  let rawPayload = update.start_payload || update.payload;
  if (rawPayload && typeof rawPayload === 'string' && rawPayload.startsWith('{')) {
    try {
      const parsed = JSON.parse(rawPayload);
      rawPayload = parsed.start_payload || parsed.payload || rawPayload;
    } catch (_) {}
  }

  const encoded = parseStartRef(rawPayload);
  console.log('handleBotStarted:', { userId, encoded, rawPayload });
  syncClientAvatar({ userId, photoUrl: maxPhotoFrom(user), name: user?.name }).catch(() => {});

  if (!encoded) {
    // Нет payload — значит пользователь просто открыл бот без ссылки мастера
    await sendMaxMessage(
      userId,
      'Чтобы записаться, откройте ссылку, которую вам отправил мастер.'
    );
    return;
  }

  await replyMasterCard(userId, encoded, user);
}

async function handleMessageCreated(update) {
  const message = update.message;
  if (!message) return;

  const userId = messageUserId(message);
  const text = (messageText(message) || '').trim();
  if (!userId || !text) return;

  const user = message.sender || message.from;

  if (text.startsWith('/start')) {
    const encoded = parseStartRef(text);
    if (encoded) {
      await replyMasterCard(userId, encoded, user);
      return;
    }
    await sendMaxMessage(
      userId,
      'Чтобы записаться, откройте ссылку, которую вам отправил мастер.'
    );
    return;
  }

  if (text === '/help') {
    await sendMaxMessage(userId, '📚 Команды:\n/start — начать\n/my — ваши записи\n/cancel_<id> — отменить запись', null, { format: 'markdown' });
    return;
  }

  if (text === '/my') {
    await replyMyBookings(userId, lastMasterByUser.get(userId));
    return;
  }

  if (text.startsWith('/cancel_')) {
    const appointmentId = text.split('_')[1];
    try {
      await cancelAppointment(userId, appointmentId);
      await sendMaxMessage(userId, '✅ Запись отменена');
    } catch (_) {
      await sendMaxMessage(userId, '❌ Не удалось отменить запись');
    }
    return;
  }

  const relayed = await relayClientMessageToSalonChat({
    userId,
    userName: user?.name || user?.first_name || 'Клиент',
    text
  });

  if (relayed) {
    await sendMaxMessage(
      userId,
      '✅ Сообщение отправлено мастеру. Ответ придет сюда.',
      null,
      { format: 'markdown' }
    );
    return;
  }

  await sendMaxMessage(
    userId,
    'Неизвестная команда. Откройте ссылку мастера через /start, либо используйте /help.',
    null,
    { format: 'markdown' }
  );
}

async function handleMessageCallback(update) {
  const callback = update.callback;
  if (!callback) return;

  const user = update.user || update.message?.sender;
  const userId = maxUserIdFrom(user) || messageUserId(update.message);
  if (!userId) return;

  const payload = callback.payload || callback.data || '';
  const callbackId = callback.callback_id || callback.id;

  try {
    await answerCallback(callbackId, '');

    if (payload === 'services') {
      await sendMaxMessage(userId, '💅 Услуги и цены — откройте страницу записи по ссылке от мастера.');
      return;
    }
    if (payload === 'reviews') {
      await sendMaxMessage(userId, '⭐ Отзывы доступны на странице мастера.');
      return;
    }
    if (payload === 'my_bookings' || payload.startsWith('my_bookings:')) {
      const encoded = payload.includes(':') ? payload.split(':')[1] : lastMasterByUser.get(userId);
      await replyMyBookings(userId, encoded);
      return;
    }
    if (payload.startsWith('cancel_apt:')) {
      const appointmentId = payload.split(':')[1];
      try {
        await cancelAppointment(userId, appointmentId);
        await sendMaxMessage(userId, 'Запись отменена.');
      } catch (_) {
        await sendMaxMessage(userId, 'Не удалось отменить запись');
      }
      return;
    }
    if (payload.startsWith('cancel_')) {
      const appointmentId = payload.split('_')[1];
      try {
        await cancelAppointment(userId, appointmentId);
        await sendMaxMessage(userId, '✅ Запись отменена');
      } catch (_) {
        await sendMaxMessage(userId, '❌ Не удалось отменить');
      }
    }
  } catch (err) {
    console.error('MAX callback error:', err.response?.data || err.message);
  }
}

function verifyWebhookSecret(req) {
  if (!WEBHOOK_SECRET) {
    return process.env.NODE_ENV !== 'production';
  }
  return req.get('X-Max-Bot-Api-Secret') === WEBHOOK_SECRET;
}

app.post('/webhook', async (req, res) => {
  try {
    if (!verifyWebhookSecret(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const update = req.body;
    const type = update.update_type;
    console.log('MAX webhook received:', JSON.stringify(update).slice(0, 500));

    if (type === 'bot_started') {
      // Дедупликация: игнорируем дубли bot_started в течение 5 секунд
      const dedupeKey = `${update.user?.user_id}_${update.payload}_${update.timestamp}`;
      if (recentWebhookEvents.has(dedupeKey)) {
        console.log('Deduplicated duplicate bot_started:', dedupeKey);
        return res.json({ ok: true });
      }
      recentWebhookEvents.set(dedupeKey, true);
      setTimeout(() => recentWebhookEvents.delete(dedupeKey), 5000);
      await handleBotStarted(update);
    } else if (type === 'message_created') {
      await handleMessageCreated(update);
    } else if (type === 'message_callback') {
      await handleMessageCallback(update);
    } else if (update.message) {
      await handleMessageCreated(update);
    } else if (update.callback_query) {
      await handleMessageCallback({
        callback: {
          callback_id: update.callback_query.id,
          payload: update.callback_query.data
        },
        user: update.callback_query.from,
        message: update.callback_query.message
      });
    } else {
      console.log('MAX unknown update type:', type, 'keys:', Object.keys(update));
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/notify', requireInternalSecret, async (req, res) => {
  try {
    const { maxUserId, message, replyUrl, replyText, imageUrl } = req.body;
    if (!maxUserId || (!message && !imageUrl)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const keyboard = replyUrl
      ? [[linkBtn(replyText || 'Ответить мастеру', replyUrl)]]
      : null;
    if (imageUrl) {
      const sent = await sendMaxImageByUrl(maxUserId, imageUrl, message || '', keyboard);
      if (!sent) {
        return res.status(500).json({ error: 'Failed to send image' });
      }
    } else {
      await sendMaxMessage(maxUserId, message, keyboard, { format: 'markdown' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('MAX notify error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', channel: 'max', timestamp: new Date().toISOString() });
});

async function ensureWebhookSubscription() {
  if (!WEBHOOK_URL) return;
  try {
    await api.post('/subscriptions', {
      url: WEBHOOK_URL,
      update_types: ['bot_started', 'message_created', 'message_callback'],
      ...(WEBHOOK_SECRET ? { secret: WEBHOOK_SECRET } : {})
    });
    console.log('MAX webhook subscription:', WEBHOOK_URL);
  } catch (err) {
    console.error('MAX webhook subscription failed:', err.response?.data || err.message);
  }
}

app.listen(PORT, () => {
  console.log(`MAX Bot на порту ${PORT}`);
  ensureWebhookSubscription().catch(() => {});
});

module.exports = app;

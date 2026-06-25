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

function buildMaxSafariUrl(pathSegment, userId, masterIdEncoded) {
  const params = new URLSearchParams({ ch: 'max', uid: String(userId), tab: 'booking' });
  appendDeepLinkAuthParams(params, {
    channel: 'max',
    userId: String(userId),
    masterIdEncoded: masterIdEncoded || pathSegment,
  });
  return `${PUBLIC_URL}/m/${pathSegment}?${params.toString()}`;
}

async function buildBookingLinks(pathSegment, userId, signMasterIdEncoded, extra = {}) {
  const encoded = signMasterIdEncoded || pathSegment;
  if (extra.reschedule || extra.tab) {
    const params = new URLSearchParams({ ch: 'max' });
    if (userId) params.set('uid', String(userId));
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    const signKey = signMasterIdEncoded || pathSegment;
    if (userId) {
      appendDeepLinkAuthParams(params, { channel: 'max', userId: String(userId), masterIdEncoded: signKey });
    }
    const url = `${PUBLIC_URL}/m/${pathSegment}?${params.toString()}`;
    return { buttonUrl: url, browserUrl: url };
  }
  const res = await axios.post(
    `${API_BASE}/api/client/short-link`,
    { masterId: encoded, channel: 'max', userId: String(userId) },
    { timeout: 15000, headers: internalAuthHeaders() }
  );
  const safariUrl = res.data.browserUrl || buildMaxSafariUrl(pathSegment, userId, encoded);
  return {
    buttonUrl: safariUrl,
    browserUrl: safariUrl,
    openUrl: res.data.url,
  };
}

async function buildBookingUrl(pathSegment, userId, signMasterIdEncoded, extra = {}) {
  const links = await buildBookingLinks(pathSegment, userId, signMasterIdEncoded, extra);
  return links.buttonUrl;
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

function clipboardBtn(text, payload) {
  return { type: 'clipboard', text, payload };
}

function callbackBtn(text, payload) {
  return { type: 'callback', text, payload };
}

function messageBtn(text) {
  return { type: 'message', text };
}

function bookingKeyboard(buttonUrl, encoded, browserUrl = null) {
  const openUrl = browserUrl || buttonUrl;
  const rows = [
    [linkBtn('Записаться', openUrl)],
    [messageBtn(openUrl)],
    [clipboardBtn('Скопировать ссылку', openUrl)],
  ];
  if (encoded) rows.push([callbackBtn('Мои записи', `my_bookings:${encoded}`)]);
  return rows;
}

function bookingOnlyKeyboard(buttonUrl, browserUrl = null) {
  const openUrl = browserUrl || buttonUrl;
  return [
    [linkBtn('Записаться', openUrl)],
    [messageBtn(openUrl)],
    [clipboardBtn('Скопировать ссылку', openUrl)],
  ];
}

function appointmentKeyboard(apt, userId, fallbackMasterIdEncoded) {
  const encoded = fallbackMasterIdEncoded || encodeMasterId(apt.master_id);
  const segment = apt.master_slug || encoded;
  return buildBookingUrl(segment, userId, encoded, {
    tab: 'booking',
    reschedule: apt.id
  }).then((rescheduleUrl) => [
    [linkBtn('Перенести запись', rescheduleUrl)],
    [callbackBtn('Отменить запись', `cancel_apt:${apt.id}`)]
  ]);
}

function formatMasterCard(card) {
  const lines = [`✨ ${card.title}`];
  const desc = truncateText(card.description, 600);
  if (desc) lines.push('', `🛠 ${desc}`);
  lines.push(
    '',
    '👇 Что можно сделать:',
    '📅 Нажмите «Записаться» или кнопку со ссылкой ниже.',
    '📋 На iPhone: зажмите ссылку в чате → «Скопировать» → вставьте в Safari.',
    '🗓 «Мои записи» — ваши будущие визиты.'
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
  if (raw.startsWith('confirm_')) return { type: 'confirm', token: raw.replace(/^confirm_/, '') };
  if (raw.startsWith('ref_')) return { type: 'ref', encoded: raw.replace(/^ref_/, '') };
  const parts = raw.split(/\s+/);
  if (parts[0] === '/start' && parts[1]?.startsWith('confirm_')) {
    return { type: 'confirm', token: parts[1].replace(/^confirm_/, '') };
  }
  if (parts[0] === '/start' && parts[1]?.startsWith('ref_')) {
    return { type: 'ref', encoded: parts[1].replace(/^ref_/, '') };
  }
  if (parts[0] === '/start' && parts[1]) {
    return { type: 'ref', encoded: parts[1] };
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
    photoUrl: absoluteUrl(master.logo_url),
    pathSegment: master.public_slug || masterIdEncoded,
    encoded: masterIdEncoded
  };
}

async function resolveBookingPathSegment(masterRef) {
  if (!masterRef) return null;
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/i.test(String(masterRef))) return String(masterRef);
  try {
    const card = await fetchMasterCard(masterRef);
    return card.pathSegment || masterRef;
  } catch {
    return masterRef;
  }
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
    notify: options.notify !== false
  };
  // MAX API: format только "markdown" | "html" — "plain" ломает запрос (proto.payload)
  if (options.format === 'markdown' || options.format === 'html') {
    body.format = options.format;
  }
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
  const text = String(notification ?? '').trim() || '✓';
  try {
    await api.post('/answers', { notification: text }, { params: { callback_id: callbackId } });
  } catch (err) {
    console.error('MAX answerCallback error:', err.response?.data || err.message);
  }
}

async function fetchAppointments(userId) {
  const res = await axios.get(`${API_BASE}/api/client/my/${userId}`, {
    params: { channel: 'max' },
    headers: internalAuthHeaders()
  });
  return res.data;
}

async function sendMaxCardWithPhoto(userId, card, buttonUrl, browserUrl = null) {
  const url = buttonUrl;
  // 1) Загружаем фото
  const uploadMeta = await api.post('/uploads', null, { params: { type: 'image' } });
  const uploadUrl = uploadMeta.data?.url;
  if (!uploadUrl) {
    await sendMaxMessage(userId, formatMasterCard(card), bookingKeyboard(url, card.encoded, browserUrl));
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
    await sendMaxMessage(userId, formatMasterCard(card), bookingKeyboard(url, card.encoded, browserUrl));
    return;
  }

  // 2) Отправляем ОДНО сообщение: текст + фото + кнопки
  const displayUrl = browserUrl || url;
  const text = `${formatMasterCard(card)}\n\n🔗 ${displayUrl}`;
  const keyboardRows = bookingKeyboard(url, card.encoded, browserUrl);

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
  lastMasterByUser.set(userId, encoded);
  syncClientAvatar({ userId, photoUrl: maxPhotoFrom(user), name: user?.name }).catch(() => {});

  let card;
  let pathSegment = await resolveBookingPathSegment(encoded);
  let links;
  try {
    card = await fetchMasterCard(encoded);
    card.encoded = encoded;
    pathSegment = card.pathSegment || pathSegment;
    links = await buildBookingLinks(pathSegment, userId, encoded);
    console.log('replyMasterCard fetched:', { title: card.title, description: card.description?.slice(0, 100), hasPhoto: !!card.photoUrl });
  } catch (err) {
    console.error('MAX fetch master card error:', err.message);
    links = await buildBookingLinks(pathSegment || encoded, userId, encoded);
    await sendMaxMessage(
      userId,
      'Запись к мастеру\n\nДля записи нажмите «Записаться».\n\n🔗 ' + links.browserUrl,
      bookingKeyboard(links.buttonUrl, encoded, links.browserUrl)
    );
    return;
  }

  if (card.photoUrl) {
    try {
      await sendMaxCardWithPhoto(userId, card, links.buttonUrl, links.browserUrl);
      return;
    } catch (photoErr) {
      console.error('MAX photo send error:', photoErr.message);
    }
  }

  await sendMaxMessage(
    userId,
    `${formatMasterCard(card)}\n\n🔗 ${links.browserUrl}`,
    bookingKeyboard(links.buttonUrl, encoded, links.browserUrl)
  );
}

async function replyMyBookings(userId, masterIdEncoded = null) {
  let bookingUrl = null;
  if (masterIdEncoded) {
    const segment = await resolveBookingPathSegment(masterIdEncoded);
    bookingUrl = await buildBookingUrl(segment || masterIdEncoded, userId, masterIdEncoded);
  }
  try {
    const appointments = await fetchAppointments(userId);
    if (!appointments.length) {
      await sendMaxMessage(
        userId,
        'У вас пока нет записей.\n\nНажмите «Записаться», чтобы выбрать услугу и удобное время.',
        bookingUrl ? bookingOnlyKeyboard(bookingUrl, bookingUrl) : null
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
      await sendMaxMessage(userId, text, await appointmentKeyboard(apt, userId, masterIdEncoded));
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

async function handleBookingConfirmOpen(userId, token, user) {
  syncClientAvatar({ userId, photoUrl: maxPhotoFrom(user), name: user?.name }).catch(() => {});
  try {
    await axios.post(
      `${API_BASE}/api/client/booking/messenger-open`,
      { token, channel: 'max', userId: String(userId) },
      { timeout: 20000, headers: internalAuthHeaders() }
    );
  } catch (err) {
    const msg = err.response?.data?.error || 'Не удалось загрузить заявку';
    if (err.response?.status === 410) {
      await sendMaxMessage(userId, 'Время подтверждения истекло. Вернитесь на сайт и запишитесь снова.');
      return;
    }
    await sendMaxMessage(userId, msg);
  }
}

async function handleBookingConfirmClick(userId, token) {
  try {
    const res = await axios.post(
      `${API_BASE}/api/client/booking/messenger-confirm`,
      { token, channel: 'max', userId: String(userId) },
      { timeout: 20000, headers: internalAuthHeaders() }
    );
    await sendMaxMessage(
      userId,
      '✅ *Запись подтверждена!*\n\nНапоминания придут сюда за *24 часа* и за *3 часа* до визита.',
      null,
      { format: 'markdown' }
    );
    if (res.data?.appointmentId) {
      await sendMaxMessage(userId, `Номер записи: ${res.data.appointmentId.slice(0, 8)}…`);
    }
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error || 'Не удалось подтвердить';
    if (status === 409) {
      await sendMaxMessage(
        userId,
        '❌ Это время уже занято.\n\nВернитесь на сайт и выберите другое время для записи.'
      );
      return;
    }
    await sendMaxMessage(userId, `❌ ${msg}`);
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

  const parsed = parseStartRef(rawPayload);
  console.log('handleBotStarted:', { userId, parsed, rawPayload });
  syncClientAvatar({ userId, photoUrl: maxPhotoFrom(user), name: user?.name }).catch(() => {});

  if (parsed?.type === 'confirm' && parsed.token) {
    await handleBookingConfirmOpen(userId, parsed.token, user);
    return;
  }

  const encoded = parsed?.type === 'ref' ? parsed.encoded : null;

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
    const parsed = parseStartRef(text);
    if (parsed?.type === 'confirm' && parsed.token) {
      await handleBookingConfirmOpen(userId, parsed.token, user);
      return;
    }
    if (parsed?.type === 'ref' && parsed.encoded) {
      await replyMasterCard(userId, parsed.encoded, user);
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

  const user = callback.user || update.user || update.message?.sender || update.message?.from;
  const userId = maxUserIdFrom(user) || messageUserId(update.message);
  if (!userId) {
    console.error('MAX callback: no userId', JSON.stringify(update).slice(0, 400));
    return;
  }

  const payload = callback.payload || callback.data || '';
  const callbackId = callback.callback_id || callback.id;

  try {
    if (payload.startsWith('confirm_booking:')) {
      const token = payload.slice('confirm_booking:'.length);
      console.log('MAX confirm_booking click:', { userId, token: token.slice(0, 12) + '…' });
      await answerCallback(callbackId, 'Подтверждаем…');
      await handleBookingConfirmClick(userId, token);
      return;
    }

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
    } else if (type === 'message_callback' || update.callback) {
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

app.post('/send-booking-confirm', requireInternalSecret, async (req, res) => {
  try {
    const { maxUserId, message, confirmToken } = req.body;
    if (!maxUserId || !message || !confirmToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await sendMaxMessage(
      maxUserId,
      message,
      [[callbackBtn('Подтвердить запись', `confirm_booking:${confirmToken}`)]],
      { format: 'markdown' }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('MAX send-booking-confirm error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.post('/notify', requireInternalSecret, async (req, res) => {
  try {
    const { maxUserId, message, replyUrl, replyText, imageUrl } = req.body;
    if (!maxUserId || (!message && !imageUrl)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const keyboard = replyUrl
      ? [[linkBtn(replyText || 'Записаться', replyUrl)]]
      : null;
    if (imageUrl) {
      const sent = await sendMaxImageByUrl(maxUserId, imageUrl, message || '', keyboard);
      if (!sent) {
        return res.status(500).json({ error: 'Failed to send image' });
      }
    } else {
      const text = replyUrl ? `${message}\n\n🔗 ${replyUrl}` : message;
      const msgOpts = req.body.format ? { format: req.body.format } : {};
      await sendMaxMessage(maxUserId, text, keyboard, msgOpts);
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

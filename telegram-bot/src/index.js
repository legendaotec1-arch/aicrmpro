require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Telegraf, Markup } = require('telegraf');
const { requireInternalSecret, internalAuthHeaders } = require('./internalAuth');

const app = express();
app.use(cors());
app.use(express.json());

const { appendDeepLinkAuthParams } = require('./clientDeepLink');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const PUBLIC_URL = (process.env.PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');
const API_BASE = resolveApiBase(BACKEND_URL, PUBLIC_URL);
const PORT = process.env.PORT || 3002;

function resolveApiBase(backendUrl, publicUrl) {
  if (process.env.BOT_API_URL) return process.env.BOT_API_URL.replace(/\/$/, '');
  if (/^https?:\/\/backend(?::|$)/i.test(backendUrl) && publicUrl) return publicUrl;
  return backendUrl;
}

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN не задан');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const lastMasterByUser = new Map();

function encodeMasterId(masterId) {
  return Buffer.from(String(masterId)).toString('base64');
}

async function fetchMasterCard(masterIdEncoded) {
  const res = await axios.get(`${API_BASE}/api/master/${masterIdEncoded}`);
  const master = res.data?.master || {};
  const title = master.display_title
    || (master.salon_name?.trim() ? master.salon_name.trim() : [master.name, master.last_name].filter(Boolean).join(' '))
    || 'Мастер';
  return {
    title,
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

/** Короткая ссылка; для переноса — длинный deeplink */
async function buildBookingLinks(pathSegment, userId, signMasterIdEncoded, extra = {}) {
  const encoded = signMasterIdEncoded || pathSegment;
  if (extra.reschedule || (extra.tab && extra.tab !== 'booking')) {
    const params = new URLSearchParams({ ch: 'telegram' });
    if (userId) params.set('uid', String(userId));
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    if (userId) {
      appendDeepLinkAuthParams(params, { channel: 'telegram', userId: String(userId), masterIdEncoded: encoded });
    }
    const url = `${PUBLIC_URL}/m/${pathSegment}?${params.toString()}`;
    return { buttonUrl: url, browserUrl: url };
  }
  const res = await axios.post(
    `${API_BASE}/api/client/short-link`,
    { masterId: encoded, channel: 'telegram', userId: String(userId) },
    { timeout: 15000, headers: internalAuthHeaders() }
  );
  return {
    buttonUrl: res.data.url || res.data.browserUrl,
    browserUrl: res.data.browserUrl || res.data.url,
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

function bookingButton(label, url) {
  return Markup.button.url(label, url);
}

function bookingKeyboard(url, encoded) {
  const rows = [[bookingButton('Записаться', url)]];
  if (encoded) rows.push([Markup.button.callback('Мои записи', `my_bookings:${encoded}`)]);
  return Markup.inlineKeyboard(rows);
}

function bookingOnlyKeyboard(url) {
  return Markup.inlineKeyboard([[bookingButton('Записаться', url)]]);
}

function appointmentKeyboard(apt, userId, fallbackMasterIdEncoded) {
  const encoded = fallbackMasterIdEncoded || encodeMasterId(apt.master_id);
  const segment = apt.master_slug || encoded;
  return buildBookingUrl(segment, userId, encoded, {
    tab: 'booking',
    reschedule: apt.id
  }).then((rescheduleUrl) => Markup.inlineKeyboard([
    [bookingButton('Перенести запись', rescheduleUrl)],
    [Markup.button.callback('Отменить запись', `cancel_apt:${apt.id}`)]
  ]));
}

function truncateText(text, max = 600) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trim()}…`;
}

function formatMasterCard(card) {
  const lines = [`✨ <b>${escapeHtml(card.title)}</b>`];
  if (card.description) lines.push('', `🛠 ${escapeHtml(truncateText(card.description))}`);
  lines.push(
    '',
    '👇 <b>Что можно сделать:</b>',
    '📅 Нажмите «Записаться», затем на экране — «Открыть запись» в Safari.',
    '🗓 Посмотреть ваши записи — <b>«Мои записи»</b>.'
  );
  return lines.join('\n');
}

async function clearOldKeyboard(ctx) {
  try {
    const msg = await ctx.reply('Открываю карточку мастера…', Markup.removeKeyboard());
    await ctx.deleteMessage(msg.message_id).catch(() => {});
  } catch (_) {
    /* ignore */
  }
}

async function replyMasterCard(ctx, encoded) {
  const userId = ctx.from.id.toString();
  lastMasterByUser.set(userId, encoded);

  let card;
  let pathSegment = await resolveBookingPathSegment(encoded);
  try {
    card = await fetchMasterCard(encoded);
    pathSegment = card.pathSegment || pathSegment;
  } catch (err) {
    console.error('Telegram fetch master card error:', err.message);
    const links = await buildBookingLinks(pathSegment || encoded, userId, encoded);
    await ctx.reply(
      `Запись к мастеру\n\nДля записи нажмите «Записаться».\n\n🔗 ${links.browserUrl}`,
      bookingKeyboard(links.buttonUrl, encoded)
    );
    return;
  }

  const links = await buildBookingLinks(pathSegment, userId, card.encoded || encoded);
  const message = `${formatMasterCard(card)}\n\n🔗 <a href="${escapeHtml(links.browserUrl)}">Ссылка для браузера</a>\n<code>${escapeHtml(links.browserUrl)}</code>`;
  const keyboard = bookingKeyboard(links.buttonUrl, encoded);

  if (card.photoUrl) {
    try {
      await ctx.replyWithPhoto(card.photoUrl, {
        caption: message,
        parse_mode: 'HTML',
        ...keyboard
      });
      return;
    } catch (photoErr) {
      console.error('Telegram photo send error:', photoErr.message);
    }
  }

  await ctx.reply(message, {
    parse_mode: 'HTML',
    ...keyboard
  });
}

function parseStartPayload(text) {
  const parts = (text || '').trim().split(/\s+/);
  if (parts.length < 2) return null;
  const payload = parts[1];
  if (payload.startsWith('confirm_')) return { type: 'confirm', token: payload.replace(/^confirm_/, '') };
  if (!payload.startsWith('ref_')) return null;
  return { type: 'ref', encoded: payload.replace('ref_', '') };
}

async function handleBookingConfirmOpen(ctx, token) {
  const userId = ctx.from.id.toString();
  syncClientAvatar(ctx).catch(() => {});
  try {
    await axios.post(
      `${API_BASE}/api/client/booking/messenger-open`,
      { token, channel: 'telegram', userId },
      { timeout: 20000, headers: internalAuthHeaders() }
    );
  } catch (err) {
    const msg = err.response?.data?.error || 'Не удалось загрузить заявку';
    if (err.response?.status === 410) {
      await ctx.reply('Время подтверждения истекло. Вернитесь на сайт и запишитесь снова.');
      return;
    }
    await ctx.reply(msg);
  }
}

async function handleBookingConfirmClick(ctx, token) {
  const userId = ctx.from.id.toString();
  try {
    const res = await axios.post(
      `${API_BASE}/api/client/booking/messenger-confirm`,
      { token, channel: 'telegram', userId },
      { timeout: 20000, headers: internalAuthHeaders() }
    );
    await ctx.answerCbQuery('Запись подтверждена!');
    await ctx.reply('✅ Запись подтверждена!\n\nНапоминания придут сюда за 24 часа и за 3 часа до визита.');
    if (res.data?.appointmentId) {
      await ctx.reply(`Номер записи: ${res.data.appointmentId.slice(0, 8)}…`);
    }
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error || 'Не удалось подтвердить';
    if (status === 409) {
      await ctx.answerCbQuery('Время уже занято', { show_alert: true });
      await ctx.reply('❌ Это время уже занято. Вернитесь на сайт и выберите другое время.');
      return;
    }
    await ctx.answerCbQuery(msg, { show_alert: true });
  }
}

async function syncClientAvatar(ctx) {
  const userId = ctx.from?.id?.toString();
  if (!userId) return;
  let photoUrl = null;
  try {
    const photos = await ctx.telegram.getUserProfilePhotos(ctx.from.id, 0, 1);
    if (photos.total_count > 0) {
      const sizes = photos.photos[0];
      const largest = sizes[sizes.length - 1];
      if (largest?.file_id) {
        const link = await ctx.telegram.getFileLink(largest.file_id);
        photoUrl = link.href;
      }
    }
  } catch (_) {
    /* ignore */
  }
  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ').trim() || null;
  try {
    await axios.post(
      `${API_BASE}/api/client/sync-avatar`,
      {
        channel: 'telegram',
        userId,
        photoUrl: photoUrl || undefined,
        name,
        username: ctx.from.username || undefined
      },
      { timeout: 15000, headers: internalAuthHeaders() }
    );
  } catch (err) {
    console.error('Telegram sync-avatar:', err.response?.data || err.message);
  }
}

async function fetchAppointments(userId) {
  const res = await axios.get(`${API_BASE}/api/client/my/${userId}`, {
    params: { channel: 'telegram' },
    headers: internalAuthHeaders()
  });
  return res.data;
}

async function replyMyBookings(ctx, masterIdEncoded = null) {
  const userId = ctx.from.id.toString();
  let bookingUrl = null;
  if (masterIdEncoded) {
    const segment = await resolveBookingPathSegment(masterIdEncoded);
    bookingUrl = await buildBookingUrl(segment || masterIdEncoded, userId, masterIdEncoded);
  }
  try {
    const appointments = await fetchAppointments(userId);
    if (!appointments.length) {
      await ctx.reply(
        'У вас пока нет записей.\n\nНажмите «Записаться», чтобы выбрать услугу и удобное время.',
        bookingUrl ? bookingOnlyKeyboard(bookingUrl) : undefined
      );
      return;
    }
    await ctx.reply('Ваши записи:');
    for (const apt of appointments) {
      const date = new Date(apt.appointment_time).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
      const text = `🧾 ${apt.service_name}\n🕒 ${date}\n📍 ${apt.address || '—'}`;
      await ctx.reply(text, await appointmentKeyboard(apt, userId, masterIdEncoded));
    }
  } catch (err) {
    console.error(err);
    await ctx.reply('Ошибка при загрузке записей');
  }
}

bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const parsed = parseStartPayload(ctx.message.text);

  if (parsed?.type === 'confirm' && parsed.token) {
    await handleBookingConfirmOpen(ctx, parsed.token);
    return;
  }

  const encoded = parsed?.type === 'ref' ? parsed.encoded : null;

  syncClientAvatar(ctx).catch(() => {});

  if (encoded) {
    await clearOldKeyboard(ctx);
    await replyMasterCard(ctx, encoded);
    return;
  }

  await ctx.reply(
    'Чтобы записаться, откройте ссылку, которую вам отправил мастер.',
    Markup.removeKeyboard()
  );
});

bot.action('my_bookings', async (ctx) => {
  await ctx.answerCbQuery();
  await replyMyBookings(ctx);
});

bot.action(/^my_bookings:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await replyMyBookings(ctx, ctx.match[1]);
});

bot.action(/^confirm_booking:(.+)$/, async (ctx) => {
  await handleBookingConfirmClick(ctx, ctx.match[1]);
});

bot.action(/^cancel_apt:(.+)$/, async (ctx) => {
  const appointmentId = ctx.match[1];
  const userId = ctx.from.id.toString();
  try {
    await axios.post(`${API_BASE}/api/client/cancel/${appointmentId}`, {
      channel: 'telegram',
      userId
    }, { headers: internalAuthHeaders() });
    await ctx.answerCbQuery('Запись отменена');
    await ctx.reply('Запись отменена.');
  } catch (err) {
    await ctx.answerCbQuery('Не удалось отменить запись', { show_alert: true });
  }
});

bot.action('services', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('💅 Услуги и цены — откройте страницу записи по ссылке от мастера.');
});

bot.action('reviews', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('⭐ Отзывы доступны на странице мастера.');
});

bot.hears(['📅 Мои записи', '📋 Записаться', '💅 Услуги и цены', '⭐ Отзывы', '💬 Написать мастеру'], async (ctx) => {
  const text = ctx.message.text;
  const encoded = lastMasterByUser.get(ctx.from.id.toString());
  if (text === '📅 Мои записи') return replyMyBookings(ctx, encoded);
  if (encoded) return replyMasterCard(ctx, encoded);
  await ctx.reply('Откройте ссылку мастера ещё раз, чтобы бот понял, к кому вы хотите записаться.', Markup.removeKeyboard());
});

bot.command('help', (ctx) =>
  ctx.reply('📚 Команды:\n/start — начать\n/my — ваши записи\n/cancel_<id> — отменить запись')
);

bot.command('my', replyMyBookings);

bot.hears(/^\/cancel_(.+)$/, async (ctx) => {
  const appointmentId = ctx.match[1];
  const userId = ctx.from.id.toString();
  try {
    await axios.post(`${API_BASE}/api/client/cancel/${appointmentId}`, {
      channel: 'telegram',
      userId
    }, { headers: internalAuthHeaders() });
    await ctx.reply('✅ Запись отменена');
  } catch (err) {
    await ctx.reply('❌ Не удалось отменить запись');
  }
});

async function configureBotMenu() {
  try {
    await bot.telegram.setChatMenuButton({ menu_button: { type: 'commands' } });
    console.log('Telegram menu: commands (без WebApp about:blank)');
  } catch (err) {
    console.error('setChatMenuButton:', err.message);
  }
}

bot.launch().then(async () => {
  await configureBotMenu();
  console.log(`Telegram bot (polling) запущен, API_BASE=${API_BASE}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

app.post('/send-booking-confirm', requireInternalSecret, async (req, res) => {
  try {
    const { telegramUserId, message, confirmToken } = req.body;
    if (!telegramUserId || !message || !confirmToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await bot.telegram.sendMessage(telegramUserId, message, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('Подтвердить запись', `confirm_booking:${confirmToken}`)]
      ]).reply_markup
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Telegram send-booking-confirm error:', error.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.post('/notify', requireInternalSecret, async (req, res) => {
  try {
    const { telegramUserId, message, replyUrl, replyText, imageUrl } = req.body;
    if (!telegramUserId || (!message && !imageUrl)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const options = replyUrl
      ? Markup.inlineKeyboard([[bookingButton(replyText || 'Записаться', replyUrl)]])
      : undefined;
    const text = replyUrl
      ? `${message || ''}\n\n🔗 ${replyUrl}`.trim()
      : message;
    if (imageUrl) {
      await bot.telegram.sendPhoto(telegramUserId, imageUrl, {
        caption: text || undefined,
        ...(options ? { reply_markup: options.reply_markup } : {}),
      });
    } else {
      await bot.telegram.sendMessage(telegramUserId, text, options);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Telegram notify error:', error.message);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', channel: 'telegram', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Telegram bot HTTP на порту ${PORT}`);
});

module.exports = app;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Telegraf, Markup } = require('telegraf');

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const PUBLIC_URL = (process.env.PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');
const PORT = process.env.PORT || 3002;

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN не задан');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const lastMasterByUser = new Map();

function encodeMasterId(masterId) {
  return Buffer.from(String(masterId)).toString('base64');
}

function buildBookingUrl(masterIdEncoded, userId, extra = {}) {
  const params = new URLSearchParams();
  if (userId) {
    params.set('ch', 'telegram');
    params.set('uid', String(userId));
  }
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const query = params.toString();
  return `${PUBLIC_URL}/m/${masterIdEncoded}${query ? `?${query}` : ''}`;
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

async function fetchMasterCard(masterIdEncoded) {
  const res = await axios.get(`${BACKEND_URL}/api/master/${masterIdEncoded}`);
  const master = res.data?.master || {};
  return {
    title: master.display_title
      || (master.salon_name?.trim() ? master.salon_name.trim() : [master.name, master.last_name].filter(Boolean).join(' '))
      || 'Мастер',
    description: master.description || '',
    photoUrl: absoluteUrl(master.logo_url)
  };
}

function webAppButton(label, url) {
  // WebApp-кнопка — открывает Mini App внутри Telegram
  return Markup.button.webApp(label, url);
}

function bookingKeyboard(url, encoded) {
  const rows = [[webAppButton('Записаться', url)]];
  if (encoded) rows.push([Markup.button.callback('Мои записи', `my_bookings:${encoded}`)]);
  return Markup.inlineKeyboard(rows);
}

function bookingOnlyKeyboard(url) {
  return Markup.inlineKeyboard([[webAppButton('Записаться', url)]]);
}

function appointmentKeyboard(apt, userId, fallbackMasterIdEncoded) {
  const encoded = fallbackMasterIdEncoded || encodeMasterId(apt.master_id);
  const rescheduleUrl = buildBookingUrl(encoded, userId, {
    tab: 'booking',
    reschedule: apt.id
  });
  return Markup.inlineKeyboard([
    [webAppButton('Перенести запись', rescheduleUrl)],
    [Markup.button.callback('Отменить запись', `cancel_apt:${apt.id}`)]
  ]);
}

function formatMasterCard(card) {
  const lines = [`✨ <b>${escapeHtml(card.title)}</b>`];
  if (card.description) lines.push('', `🛠 ${escapeHtml(card.description)}`);
  lines.push(
    '',
    '👇 <b>Что можно сделать:</b>',
    '📅 Для записи нажмите <b>«Записаться»</b>.',
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
  const url = buildBookingUrl(encoded, userId);
  lastMasterByUser.set(userId, encoded);

  try {
    const card = await fetchMasterCard(encoded);
    const message = formatMasterCard(card);

    if (card.photoUrl) {
      await ctx.replyWithPhoto(card.photoUrl, {
        caption: message,
        parse_mode: 'HTML',
        ...bookingKeyboard(url, encoded)
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'HTML',
        ...bookingKeyboard(url, encoded)
      });
    }
  } catch (err) {
    console.error('Telegram master card error:', err.message);
    await ctx.reply(
      'Запись к мастеру\n\nДля записи нажмите кнопку «Записаться».',
      bookingKeyboard(url, encoded)
    );
  }
}

function parseStartPayload(text) {
  const parts = (text || '').trim().split(/\s+/);
  if (parts.length < 2) return null;
  const payload = parts[1];
  if (!payload.startsWith('ref_')) return null;
  return payload.replace('ref_', '');
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
      `${BACKEND_URL}/api/client/sync-avatar`,
      {
        channel: 'telegram',
        userId,
        photoUrl: photoUrl || undefined,
        name,
        username: ctx.from.username || undefined
      },
      { timeout: 15000 }
    );
  } catch (err) {
    console.error('Telegram sync-avatar:', err.response?.data || err.message);
  }
}

async function fetchAppointments(userId) {
  const res = await axios.get(`${BACKEND_URL}/api/client/my/${userId}`, {
    params: { channel: 'telegram' }
  });
  return res.data;
}

async function replyMyBookings(ctx, masterIdEncoded = null) {
  const userId = ctx.from.id.toString();
  const bookingUrl = masterIdEncoded ? buildBookingUrl(masterIdEncoded, userId) : null;
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
      await ctx.reply(text, appointmentKeyboard(apt, userId, masterIdEncoded));
    }
  } catch (err) {
    console.error(err);
    await ctx.reply('Ошибка при загрузке записей');
  }
}

bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const encoded = parseStartPayload(ctx.message.text);

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

bot.action(/^cancel_apt:(.+)$/, async (ctx) => {
  const appointmentId = ctx.match[1];
  const userId = ctx.from.id.toString();
  try {
    await axios.post(`${BACKEND_URL}/api/client/cancel/${appointmentId}`, {
      channel: 'telegram',
      userId
    });
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
    await axios.post(`${BACKEND_URL}/api/client/cancel/${appointmentId}`, {
      channel: 'telegram',
      userId
    });
    await ctx.reply('✅ Запись отменена');
  } catch (err) {
    await ctx.reply('❌ Не удалось отменить запись');
  }
});

bot.launch().then(() => console.log('Telegram bot (polling) запущен'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

app.post('/notify', async (req, res) => {
  try {
    const { telegramUserId, message, replyUrl, replyText } = req.body;
    if (!telegramUserId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const options = replyUrl
      ? Markup.inlineKeyboard([[webAppButton(replyText || 'Ответить мастеру', replyUrl)]])
      : undefined;
    await bot.telegram.sendMessage(telegramUserId, message, options);
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

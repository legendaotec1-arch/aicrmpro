const axios = require('axios');
const db = require('../config/database');
const { internalAuthHeaders } = require('./internalAuth');

async function resolveNotificationTargets(client, options = {}) {
  let telegramUserId = client?.telegram_user_id ? String(client.telegram_user_id) : null;
  let maxUserId = client?.max_user_id ? String(client.max_user_id) : null;

  const appointmentId = options.appointmentId;
  if (appointmentId) {
    try {
      const bcp = await db.query(
        `SELECT channel, messenger_user_id FROM booking_confirm_pending
         WHERE appointment_id = $1
         ORDER BY confirmed_at DESC NULLS LAST, created_at DESC
         LIMIT 1`,
        [appointmentId]
      );
      const book = bcp.rows[0];
      if (book?.messenger_user_id) {
        if (book.channel === 'telegram') telegramUserId = String(book.messenger_user_id);
        if (book.channel === 'max') maxUserId = String(book.messenger_user_id);
      }
    } catch (err) {
      console.error('[notify] resolve targets:', err.message);
    }
  }

  return { telegramUserId, maxUserId };
}

async function sendMessengerNotification(client, message, options = {}) {
  const maxBotUrl = (process.env.MAX_BOT_URL || 'http://localhost:3001').replace(/\/$/, '');
  const telegramBotUrl = (process.env.TELEGRAM_BOT_URL || 'http://localhost:3002').replace(/\/$/, '');
  const channel = options.channel || 'all';
  const headers = internalAuthHeaders();
  const imageUrl = options.imageUrl || null;
  let sent = 0;

  const sendTelegram = channel === 'all' || channel === 'telegram';
  const sendMax = channel === 'all' || channel === 'max';

  const { telegramUserId, maxUserId } = await resolveNotificationTargets(client, options);

  const payload = {
    message,
    replyUrl: options.replyUrl,
    replyText: options.replyText,
    format: options.format,
    ...(imageUrl ? { imageUrl } : {}),
  };

  if (sendTelegram && telegramUserId) {
    try {
      await axios.post(
        `${telegramBotUrl}/notify`,
        { telegramUserId, ...payload },
        { headers, timeout: 20000 }
      );
      sent += 1;
    } catch (err) {
      console.error('[notify] Telegram failed:', err.response?.data || err.message);
    }
  }

  if (sendMax && maxUserId) {
    try {
      await axios.post(
        `${maxBotUrl}/notify`,
        { maxUserId, ...payload },
        { headers, timeout: 20000 }
      );
      sent += 1;
    } catch (err) {
      console.error('[notify] MAX failed:', { maxUserId, error: err.response?.data || err.message });
    }
  }

  if (sent === 0) {
    console.warn('[notify] No messenger delivered', {
      appointmentId: options.appointmentId || null,
      telegramUserId: telegramUserId || null,
      maxUserId: maxUserId || null,
      channel
    });
  }

  return sent > 0;
}

module.exports = { sendMessengerNotification, resolveNotificationTargets };

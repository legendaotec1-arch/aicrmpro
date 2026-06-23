const axios = require('axios');
const { internalAuthHeaders } = require('./internalAuth');

async function sendMessengerNotification(client, message, options = {}) {
  const maxBotUrl = process.env.MAX_BOT_URL || 'http://localhost:3001';
  const telegramBotUrl = process.env.TELEGRAM_BOT_URL || 'http://localhost:3002';
  const channel = options.channel || 'all';
  const headers = internalAuthHeaders();
  const imageUrl = options.imageUrl || null;
  let sent = 0;

  const sendTelegram = channel === 'all' || channel === 'telegram';
  const sendMax = channel === 'all' || channel === 'max';

  const payload = {
    message,
    replyUrl: options.replyUrl,
    replyText: options.replyText,
    ...(imageUrl ? { imageUrl } : {}),
  };

  if (sendTelegram && client.telegram_user_id) {
    try {
      await axios.post(
        `${telegramBotUrl}/notify`,
        {
          telegramUserId: client.telegram_user_id,
          ...payload,
        },
        { headers }
      );
      sent += 1;
    } catch (err) {
      console.error('[notify] Telegram failed:', err.response?.data || err.message);
    }
  }

  if (sendMax && client.max_user_id) {
    try {
      await axios.post(
        `${maxBotUrl}/notify`,
        {
          maxUserId: client.max_user_id,
          ...payload,
        },
        { headers }
      );
      sent += 1;
    } catch (err) {
      console.error('[notify] MAX failed:', err.response?.data || err.message);
    }
  }

  if (sent === 0 && channel === 'all') {
    if (client.messenger === 'telegram' && client.telegram_user_id) {
      try {
        await axios.post(
          `${telegramBotUrl}/notify`,
          {
            telegramUserId: client.telegram_user_id,
            ...payload,
          },
          { headers }
        );
        return true;
      } catch (err) {
        console.error('[notify] Telegram fallback failed:', err.response?.data || err.message);
      }
    }
  }

  return sent > 0;
}

module.exports = { sendMessengerNotification };

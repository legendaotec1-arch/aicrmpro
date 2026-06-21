const axios = require('axios');
const { internalAuthHeaders } = require('./internalAuth');

async function sendMessengerNotification(client, message, options = {}) {
  const maxBotUrl = process.env.MAX_BOT_URL || 'http://localhost:3001';
  const telegramBotUrl = process.env.TELEGRAM_BOT_URL || 'http://localhost:3002';
  const channel = options.channel || 'all';
  const headers = internalAuthHeaders();
  let sent = 0;

  const sendTelegram = channel === 'all' || channel === 'telegram';
  const sendMax = channel === 'all' || channel === 'max';

  if (sendTelegram && client.telegram_user_id) {
    await axios.post(
      `${telegramBotUrl}/notify`,
      {
        telegramUserId: client.telegram_user_id,
        message,
        replyUrl: options.replyUrl,
        replyText: options.replyText
      },
      { headers }
    );
    sent += 1;
  }

  if (sendMax && client.max_user_id) {
    await axios.post(
      `${maxBotUrl}/notify`,
      {
        maxUserId: client.max_user_id,
        message,
        replyUrl: options.replyUrl,
        replyText: options.replyText
      },
      { headers }
    );
    sent += 1;
  }

  if (sent === 0 && channel === 'all') {
    if (client.messenger === 'telegram' && client.telegram_user_id) {
      await axios.post(
        `${telegramBotUrl}/notify`,
        {
          telegramUserId: client.telegram_user_id,
          message,
          replyUrl: options.replyUrl,
          replyText: options.replyText
        },
        { headers }
      );
      return true;
    }
  }

  return sent > 0;
}

module.exports = { sendMessengerNotification };

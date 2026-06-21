const axios = require('axios');

async function sendMessengerNotification(client, message, options = {}) {
  const maxBotUrl = process.env.MAX_BOT_URL || 'http://localhost:3001';
  const telegramBotUrl = process.env.TELEGRAM_BOT_URL || 'http://localhost:3002';

  if (client.messenger === 'telegram' && client.telegram_user_id) {
    await axios.post(`${telegramBotUrl}/notify`, {
      telegramUserId: client.telegram_user_id,
      message,
      replyUrl: options.replyUrl,
      replyText: options.replyText
    });
    return true;
  }

  if (client.max_user_id) {
    await axios.post(`${maxBotUrl}/notify`, {
      maxUserId: client.max_user_id,
      message,
      replyUrl: options.replyUrl,
      replyText: options.replyText
    });
    return true;
  }

  return false;
}

module.exports = { sendMessengerNotification };

const axios = require('axios');

function normalizeTelegramUsername(username) {
  if (!username) return null;
  const s = String(username).replace(/^@/, '').trim();
  return s || null;
}

async function resolveTelegramChatUrl({ telegramUserId, telegramUsername }) {
  const username = normalizeTelegramUsername(telegramUsername);
  if (username) return `https://t.me/${username}`;

  if (!telegramUserId) return null;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token) {
    try {
      const { data } = await axios.get(`https://api.telegram.org/bot${token}/getChat`, {
        params: { chat_id: telegramUserId },
        timeout: 5000
      });
      const fromApi = normalizeTelegramUsername(data?.result?.username);
      if (fromApi) return `https://t.me/${fromApi}`;
    } catch (_) {
      /* fallback below */
    }
  }

  return `tg://user?id=${telegramUserId}`;
}

module.exports = {
  normalizeTelegramUsername,
  resolveTelegramChatUrl
};

const crypto = require('crypto');

const MAX_AUTH_AGE_SEC = 86400;

/**
 * Проверка данных Telegram Login Widget (legacy).
 * @see https://core.telegram.org/widgets/login
 */
function verifyTelegramLoginWidget(data, botToken) {
  if (!data || !botToken) return false;

  const hash = data.hash;
  if (!hash || data.id == null || data.auth_date == null) return false;

  const authDate = Number(data.auth_date);
  if (!Number.isFinite(authDate)) return false;
  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (ageSec < 0 || ageSec > MAX_AUTH_AGE_SEC) return false;

  const fields = {};
  for (const key of ['auth_date', 'first_name', 'id', 'last_name', 'photo_url', 'username']) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      fields[key] = String(data[key]);
    }
  }

  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return computedHash === hash;
}

module.exports = { verifyTelegramLoginWidget, MAX_AUTH_AGE_SEC };

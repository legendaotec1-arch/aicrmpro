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

/**
 * Проверка initData из Telegram Mini App (WebApp).
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramWebAppInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate)) return null;
  const ageSec = Math.floor(Date.now() / 1000) - authDate;
  if (ageSec < 0 || ageSec > MAX_AUTH_AGE_SEC) return null;

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computedHash !== hash) return null;

  let user = null;
  const userRaw = params.get('user');
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      return null;
    }
  }
  if (!user?.id) return null;

  return {
    telegramUserId: String(user.id),
    firstName: user.first_name || null,
    lastName: user.last_name || null,
    username: user.username || null,
    photoUrl: user.photo_url || null
  };
}

module.exports = { verifyTelegramLoginWidget, verifyTelegramWebAppInitData, MAX_AUTH_AGE_SEC };

const crypto = require('crypto');

function getSecret() {
  return (process.env.INTERNAL_API_SECRET || '').trim();
}

function signDeepLinkAuth({ channel, userId, masterIdEncoded, exp }) {
  const secret = getSecret();
  if (!secret) throw new Error('INTERNAL_API_SECRET not configured');
  const payload = `${channel}:${userId}:${masterIdEncoded}:${exp}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function appendDeepLinkAuthParams(params, { channel, userId, masterIdEncoded }) {
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
  params.set('exp', String(exp));
  params.set('sig', signDeepLinkAuth({ channel, userId: String(userId), masterIdEncoded, exp }));
  return params;
}

module.exports = { appendDeepLinkAuthParams };

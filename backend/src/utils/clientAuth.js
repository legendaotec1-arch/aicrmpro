const jwt = require('jsonwebtoken');
const { resolveJwtSecret } = require('./jwtConfig');
const { normalizeChannel } = require('./clients');
const { verifyInternalSecret } = require('./internalAuth');

function signClientToken({ channel, userId, masterId }) {
  return jwt.sign(
    { typ: 'client', channel, userId: String(userId), masterId: masterId || null },
    resolveJwtSecret(),
    { expiresIn: process.env.CLIENT_TOKEN_EXPIRES_IN || '30d' }
  );
}

function verifyClientToken(token) {
  const decoded = jwt.verify(token, resolveJwtSecret());
  if (decoded.typ !== 'client' || !decoded.channel || !decoded.userId) {
    throw new Error('Invalid client token');
  }
  return decoded;
}

function extractClientToken(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return req.headers['x-client-token'] || null;
}

function extractRequestMessengerUser(req) {
  const channel = normalizeChannel(req.body?.channel || req.query?.channel);
  const userId =
    req.body?.userId ||
    req.query?.userId ||
    (channel === 'telegram' ? req.body?.telegramUserId || req.query?.telegramUserId : null) ||
    (channel === 'max' ? req.body?.maxUserId || req.query?.maxUserId : null);
  return { channel, userId: userId ? String(userId) : null };
}

function requireClientAccess(req, res, next) {
  if (verifyInternalSecret(req)) {
    req.clientAccess = { internal: true };
    return next();
  }

  const token = extractClientToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const decoded = verifyClientToken(token);
    const { channel, userId } = extractRequestMessengerUser(req);
    if (userId && userId !== decoded.userId) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    if (channel && channel !== decoded.channel) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    req.clientAccess = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Неверный токен клиента' });
  }
}

module.exports = {
  signClientToken,
  verifyClientToken,
  requireClientAccess,
  extractClientToken
};

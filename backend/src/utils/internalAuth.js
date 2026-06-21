const crypto = require('crypto');

function getInternalSecret() {
  return (process.env.INTERNAL_API_SECRET || '').trim();
}

function isInternalSecretConfigured() {
  return getInternalSecret().length >= 16;
}

function verifyInternalSecret(req) {
  const expected = getInternalSecret();
  if (!expected) return false;
  const provided = req.headers['x-internal-secret'] || req.headers['x-internal-api-secret'];
  if (!provided || typeof provided !== 'string') return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

function requireInternalSecret(req, res, next) {
  if (!isInternalSecretConfigured()) {
    console.error('[security] INTERNAL_API_SECRET is not configured');
    return res.status(503).json({ error: 'Internal API not configured' });
  }
  if (!verifyInternalSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function internalAuthHeaders() {
  const secret = getInternalSecret();
  if (!secret) return {};
  return { 'X-Internal-Secret': secret };
}

module.exports = {
  getInternalSecret,
  isInternalSecretConfigured,
  verifyInternalSecret,
  requireInternalSecret,
  internalAuthHeaders
};

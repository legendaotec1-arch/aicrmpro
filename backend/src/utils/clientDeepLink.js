const crypto = require('crypto');
const { getInternalSecret } = require('./internalAuth');
const { encodeMasterId } = require('./links');

const DEFAULT_TTL_SEC = 7 * 24 * 3600;

function signDeepLinkAuth({ channel, userId, masterIdEncoded, exp }) {
  const secret = getInternalSecret();
  if (!secret) throw new Error('INTERNAL_API_SECRET not configured');
  const payload = `${String(channel)}:${String(userId)}:${String(masterIdEncoded)}:${Number(exp)}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyDeepLinkAuth({ channel, userId, masterIdEncoded, exp, sig }) {
  if (!channel || !userId || !masterIdEncoded || !exp || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) return false;
  try {
    const expected = signDeepLinkAuth({
      channel: String(channel),
      userId: String(userId),
      masterIdEncoded: String(masterIdEncoded),
      exp: expNum
    });
    const providedHex = String(sig).trim().toLowerCase();
    const expectedHex = expected.toLowerCase();
    if (providedHex.length !== 64 || expectedHex.length !== 64) return false;
    return crypto.timingSafeEqual(
      Buffer.from(providedHex, 'hex'),
      Buffer.from(expectedHex, 'hex')
    );
  } catch {
    return false;
  }
}

function appendDeepLinkAuthParams(params, { channel, userId, masterIdEncoded, ttlSec = DEFAULT_TTL_SEC }) {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = signDeepLinkAuth({ channel, userId, masterIdEncoded, exp });
  params.set('exp', String(exp));
  params.set('sig', sig);
  return params;
}

function buildSignedClientWebUrl(masterId, channel, userId, extra = {}, pathSegment = null) {
  const base = (process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const masterIdEncoded = encodeMasterId(masterId);
  const segment = pathSegment || masterIdEncoded;
  const params = new URLSearchParams({ ch: channel, uid: String(userId) });
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  appendDeepLinkAuthParams(params, { channel, userId: String(userId), masterIdEncoded });
  return `${base}/m/${segment}?${params.toString()}`;
}

/** Подпись могла быть по slug или encoded id — проверяем все варианты */
function verifyDeepLinkAuthAny({ channel, userId, masterIdCandidates, exp, sig }) {
  const seen = new Set();
  for (const candidate of masterIdCandidates) {
    const key = String(candidate || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (verifyDeepLinkAuth({ channel, userId, masterIdEncoded: key, exp, sig })) return true;
  }
  return false;
}

module.exports = {
  signDeepLinkAuth,
  verifyDeepLinkAuth,
  verifyDeepLinkAuthAny,
  appendDeepLinkAuthParams,
  buildSignedClientWebUrl,
  DEFAULT_TTL_SEC
};

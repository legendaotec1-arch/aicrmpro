function encodeMasterId(masterId) {
  return Buffer.from(masterId).toString('base64');
}

function decodeMasterId(encoded) {
  return Buffer.from(encoded, 'base64').toString('utf8');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveMasterId(param) {
  if (!param) return param;
  const decoded = tryDecodeMasterId(param);
  return decoded || param;
}

function tryDecodeMasterId(param) {
  if (!param) return null;
  if (UUID_RE.test(param)) return param;
  try {
    const normalized = String(param).replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(normalized, 'base64').toString('utf8');
    if (UUID_RE.test(decoded)) return decoded;
  } catch (_) {
    /* ignore */
  }
  return null;
}

function isResolvedMasterId(id) {
  return Boolean(id && UUID_RE.test(id));
}

function getPublicUrl() {
  return (process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

/** Имя бота в MAX без @ и без https://max.ru/ */
function normalizeMaxBotUsername(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  const m = s.match(/max\.ru\/([^/?#]+)/i);
  if (m) s = m[1];
  s = s.replace(/^@/, '').replace(/\/$/, '');
  return s || null;
}

function buildMasterLinks(masterId) {
  const encoded = encodeMasterId(masterId);
  const base = getPublicUrl();
  const clientUrl = `${base}/m/${encoded}`;
  const botPayload = `ref_${encoded}`;

  const telegramUsername = process.env.TELEGRAM_BOT_USERNAME;
  const maxBotUsername = normalizeMaxBotUsername(process.env.MAX_BOT_USERNAME);

  const maxBotDeepLink = maxBotUsername
    ? `https://max.ru/${maxBotUsername}?start=${botPayload}`
    : null;
  const telegramBotDeepLink = telegramUsername
    ? `https://t.me/${telegramUsername}?start=${botPayload}`
    : null;

  const links = {
    client: { web: clientUrl },
    max: {
      web: clientUrl,
      botStart: botPayload,
      botDeepLink: maxBotDeepLink
    },
    telegram: {
      web: clientUrl,
      botStart: botPayload,
      botDeepLink: telegramBotDeepLink
    }
  };

  return { encodedMasterId: encoded, clientUrl, links };
}

module.exports = {
  encodeMasterId,
  decodeMasterId,
  resolveMasterId,
  tryDecodeMasterId,
  isResolvedMasterId,
  getPublicUrl,
  normalizeMaxBotUsername,
  buildMasterLinks
};

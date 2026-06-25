const db = require('../config/database');
const { encodeMasterId, getPublicUrl } = require('./links');
const { assignUniqueSlug } = require('../seo/masterSeo');
const { buildSignedClientWebUrl } = require('./clientDeepLink');

/** Всегда возвращает public_slug (создаёт при отсутствии) */
async function ensurePublicSlug(salonId, dbConn = db) {
  const res = await dbConn.query(
    `SELECT id, name, last_name, salon_name, address, city, public_slug
     FROM masters WHERE id = $1`,
    [salonId]
  );
  const row = res.rows[0];
  if (!row) return null;
  return row.public_slug || assignUniqueSlug(dbConn, row);
}

function buildPublicWebUrl(slug, extra = {}) {
  const base = getPublicUrl();
  const params = new URLSearchParams();
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return `${base}/m/${slug}${qs ? `?${qs}` : ''}`;
}

/** Ссылка на страницу записи для кнопок в MAX / Telegram */
async function buildMessengerBookingUrl(salonId, channel, userId, tab = 'booking', publicSlug = null) {
  const slug = publicSlug || await ensurePublicSlug(salonId);
  if (!slug) return buildPublicWebUrl(encodeMasterId(salonId), tab ? { tab } : {});
  if (channel === 'telegram' && userId) {
    return buildSignedClientWebUrl(salonId, 'telegram', userId, tab ? { tab } : {}, slug);
  }
  if (channel === 'telegram') {
    return buildPublicWebUrl(slug, tab ? { tab } : {});
  }
  if (channel === 'max' && userId) {
    return buildSignedClientWebUrl(salonId, 'max', userId, tab ? { tab } : {}, slug);
  }
  return buildPublicWebUrl(slug, tab ? { tab } : {});
}

module.exports = {
  ensurePublicSlug,
  buildPublicWebUrl,
  buildMessengerBookingUrl,
};

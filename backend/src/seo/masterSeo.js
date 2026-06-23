const db = require('../config/database');
const { formatMasterPublicTitle } = require('../utils/masterDisplay');
const { slugify, extractCityFromAddress, isPublicSlug } = require('../utils/slugify');
const { resolveMasterId, tryDecodeMasterId, encodeMasterId, getPublicUrl } = require('../utils/links');
const { SITE_URL } = require('./config');

function buildSlugBase(master) {
  const title = formatMasterPublicTitle(master);
  const city = master.city || extractCityFromAddress(master.address);
  const namePart = slugify(title);
  const cityPart = city ? slugify(city) : '';
  if (namePart && cityPart) return `${namePart}-${cityPart}`;
  return namePart || `master-${String(master.id || '').slice(0, 8)}`;
}

async function slugExists(dbConn, slug, excludeId = null) {
  const params = [slug];
  let sql = 'SELECT id FROM masters WHERE public_slug = $1';
  if (excludeId) {
    sql += ' AND id != $2';
    params.push(excludeId);
  }
  const res = await dbConn.query(sql, params);
  return res.rows.length > 0;
}

async function assignUniqueSlug(dbConn, master, { force = false } = {}) {
  if (!master?.id) return null;
  if (master.public_slug && !force) return master.public_slug;

  const base = buildSlugBase(master);
  if (!base) return null;

  let candidate = base;
  let n = 2;
  while (await slugExists(dbConn, candidate, master.id)) {
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 50) {
      candidate = `${base}-${String(master.id).slice(0, 6)}`;
      break;
    }
  }

  const city = master.city || extractCityFromAddress(master.address);
  await dbConn.query(
    `UPDATE masters SET public_slug = $1, city = COALESCE(city, $2), updated_at = NOW() WHERE id = $3`,
    [candidate, city, master.id]
  );
  return candidate;
}

async function resolveMasterIdFromParam(param, dbConn = db) {
  if (!param) return null;
  const decoded = resolveMasterId(param);
  if (decoded && /^[0-9a-f-]{36}$/i.test(decoded)) return decoded;

  if (isPublicSlug(param)) {
    const res = await dbConn.query(
      'SELECT id FROM masters WHERE public_slug = $1 LIMIT 1',
      [param]
    );
    return res.rows[0]?.id || null;
  }
  return null;
}

function masterPublicUrl(slugOrSegment) {
  return `${SITE_URL}/m/${slugOrSegment}`;
}

function buildMasterMeta(master, { services = [], reviewSummary = {} } = {}) {
  const title = formatMasterPublicTitle(master);
  const city = master.city || extractCityFromAddress(master.address);
  const cityPart = city ? ` в ${city}` : '';
  const serviceNames = services.slice(0, 5).map((s) => s.name).filter(Boolean);
  const servicesHint = serviceNames.length
    ? ` Услуги: ${serviceNames.join(', ')}.`
    : '';

  const pageTitle = city
    ? `${title} — онлайн-запись${cityPart} | Woner.ru`
    : `${title} — онлайн-запись | Woner.ru`;

  let description = master.description
    ? String(master.description).trim().slice(0, 140)
    : `Онлайн-запись к ${title}${cityPart}. Выберите услугу и удобное время.`;

  if (reviewSummary.count > 0 && reviewSummary.average) {
    description += ` Рейтинг ${reviewSummary.average} (${reviewSummary.count} отзывов).`;
  }
  description += servicesHint;
  description = description.slice(0, 300);

  return { title: pageTitle, description, h1: title };
}

async function loadMasterSeoBundle(masterId, dbConn = db) {
  const masterRes = await dbConn.query(
    `SELECT id, name, last_name, salon_name, logo_url, description, phone, address,
            latitude, longitude, yandex_maps_link, city, public_slug, public_indexable
     FROM masters WHERE id = $1`,
    [masterId]
  );
  if (!masterRes.rows.length) return null;
  const master = masterRes.rows[0];

  const servicesRes = await dbConn.query(
    `SELECT pi.name, pi.price, pi.price_max, pi.price_type, pi.duration_minutes
     FROM price_items pi
     JOIN salon_masters sm ON sm.id = pi.salon_master_id
     WHERE sm.salon_id = $1 AND sm.is_active = TRUE
     ORDER BY pi.sort_order NULLS LAST, pi.name
     LIMIT 30`,
    [masterId]
  );

  const reviewStats = await dbConn.query(
    `SELECT COUNT(*)::int AS count, ROUND(AVG(rating)::numeric, 1) AS average
     FROM reviews WHERE salon_id = $1 AND is_published = TRUE`,
    [masterId]
  );

  const slug = master.public_slug || await assignUniqueSlug(dbConn, master);
  const services = servicesRes.rows;
  const reviewSummary = {
    count: reviewStats.rows[0]?.count || 0,
    average: Number(reviewStats.rows[0]?.average) || null,
  };
  const meta = buildMasterMeta(master, { services, reviewSummary });
  const canonical = masterPublicUrl(slug);

  return {
    master: { ...master, public_slug: slug, display_title: formatMasterPublicTitle(master) },
    slug,
    services,
    reviewSummary,
    meta,
    canonical,
    indexable: master.public_indexable !== false,
  };
}

async function backfillMasterSlugs(dbConn = db) {
  const res = await dbConn.query(
    `SELECT id, name, last_name, salon_name, address, city, public_slug
     FROM masters WHERE public_slug IS NULL
     ORDER BY created_at ASC`
  );
  let count = 0;
  for (const row of res.rows) {
    await assignUniqueSlug(dbConn, row);
    count += 1;
  }
  return count;
}

function shouldRedirectToCanonicalSlug(param, slug) {
  if (!slug || param === slug) return false;
  if (isPublicSlug(param)) return param !== slug;
  return Boolean(tryDecodeMasterId(param) || /^[0-9a-f-]{36}$/i.test(param));
}

module.exports = {
  buildSlugBase,
  assignUniqueSlug,
  resolveMasterIdFromParam,
  masterPublicUrl,
  buildMasterMeta,
  loadMasterSeoBundle,
  backfillMasterSlugs,
  shouldRedirectToCanonicalSlug,
  isPublicSlug,
};

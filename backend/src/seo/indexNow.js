const crypto = require('crypto');
const { SITE_URL } = require('./config');

const INDEXNOW_ENDPOINTS = [
  'https://yandex.com/indexnow',
  'https://api.indexnow.org/indexnow',
];

const BATCH_SIZE = 10_000;

function getSiteHost() {
  try {
    return new URL(SITE_URL).hostname.replace(/^www\./, '');
  } catch {
    return 'woner.ru';
  }
}

function getIndexNowKey() {
  const key = String(process.env.INDEXNOW_KEY || '').trim();
  if (!key) return null;
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) return null;
  return key;
}

function isIndexNowConfigured() {
  return Boolean(getIndexNowKey());
}

function getKeyLocation() {
  const key = getIndexNowKey();
  if (!key) return null;
  return `${SITE_URL}/${key}.txt`;
}

function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  const value = String(pathOrUrl).trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

function pathsFromSlugs(items, prefix = '') {
  return items
    .map((item) => {
      const slug = typeof item === 'string' ? item : item?.slug;
      if (!slug) return null;
      return absoluteUrl(`${prefix}/${slug}`.replace(/\/+/g, '/'));
    })
    .filter(Boolean);
}

async function notifyIndexNow(urlList, { logPrefix = '[indexnow]' } = {}) {
  if (!isIndexNowConfigured()) {
    return { ok: false, skipped: true, reason: 'not_configured' };
  }

  const key = getIndexNowKey();
  const urls = [...new Set(urlList.map(absoluteUrl).filter(Boolean))];
  if (!urls.length) {
    return { ok: false, skipped: true, reason: 'empty' };
  }

  const host = getSiteHost();
  const keyLocation = getKeyLocation();
  const results = [];

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const urlBatch = urls.slice(i, i + BATCH_SIZE);
    const body = { host, key, keyLocation, urlList: urlBatch };

    for (const endpoint of INDEXNOW_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify(body),
        });
        results.push({
          endpoint,
          status: res.status,
          ok: res.ok || res.status === 202,
          batchSize: urlBatch.length,
        });
      } catch (err) {
        results.push({ endpoint, ok: false, error: err.message, batchSize: urlBatch.length });
      }
    }
  }

  const ok = results.some((r) => r.ok);
  console.log(
    `${logPrefix} ${urls.length} URL → ${results.map((r) => `${r.endpoint}:${r.status || r.error}`).join(', ')}`
  );

  return { ok, submitted: urls.length, host, keyLocation, results };
}

function notifyIndexNowLater(urlList, options) {
  notifyIndexNow(urlList, options).catch((err) => {
    console.error('[indexnow] notify failed:', err.message);
  });
}

async function getRecentlyPublishedArticleUrls(dbConn, hours = 30) {
  const res = await dbConn.query(
    `SELECT slug FROM seo_articles
     WHERE published = TRUE
       AND published_at <= NOW()
       AND published_at >= NOW() - ($1::text || ' hours')::interval
     ORDER BY published_at DESC
     LIMIT 500`,
    [String(hours)]
  );
  return pathsFromSlugs(res.rows, '/blog');
}

async function getRecentlyUpdatedPageUrls(dbConn, hours = 24) {
  const res = await dbConn.query(
    `SELECT slug FROM seo_pages
     WHERE updated_at >= NOW() - ($1::text || ' hours')::interval
     ORDER BY updated_at DESC
     LIMIT 500`,
    [String(hours)]
  );
  return pathsFromSlugs(res.rows);
}

async function getSitemapUrlsForIndexNow(dbConn) {
  const { collectSitemapUrls } = require('./sitemap');
  const { staticUrls, pageUrls, geoUrls, articleUrls, masterUrls } = await collectSitemapUrls(dbConn);
  return [
    ...staticUrls.map((u) => u.loc),
    ...pageUrls.map((u) => u.loc),
    ...geoUrls.map((u) => u.loc),
    ...articleUrls.map((u) => u.loc),
    ...masterUrls.map((u) => u.loc),
  ];
}

async function getGeoUrlsForIndexNow(dbConn) {
  const { collectSitemapUrls } = require('./sitemap');
  const { geoUrls } = await collectSitemapUrls(dbConn);
  return geoUrls.map((u) => u.loc);
}

function registerIndexNowKeyRoute(app) {
  const key = getIndexNowKey();
  if (!key) {
    console.log('[indexnow] INDEXNOW_KEY не задан — уведомления отключены');
    return;
  }
  app.get(`/${key}.txt`, (_req, res) => {
    res.type('text/plain').send(key);
  });
  console.log(`[indexnow] Ключ: ${getKeyLocation()}`);
}

function generateIndexNowKey() {
  return crypto.randomBytes(16).toString('hex');
}

function getIndexNowStatus() {
  const key = getIndexNowKey();
  return {
    configured: Boolean(key),
    host: getSiteHost(),
    keyLocation: key ? getKeyLocation() : null,
    endpoints: INDEXNOW_ENDPOINTS,
  };
}

module.exports = {
  getIndexNowKey,
  isIndexNowConfigured,
  getKeyLocation,
  getIndexNowStatus,
  absoluteUrl,
  pathsFromSlugs,
  notifyIndexNow,
  notifyIndexNowLater,
  getRecentlyPublishedArticleUrls,
  getRecentlyUpdatedPageUrls,
  getSitemapUrlsForIndexNow,
  getGeoUrlsForIndexNow,
  registerIndexNowKeyRoute,
  generateIndexNowKey,
};

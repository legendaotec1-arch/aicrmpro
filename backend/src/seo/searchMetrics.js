const axios = require('axios');
const jwt = require('jsonwebtoken');
const { SITE_URL } = require('./config');

const YANDEX_API = 'https://api.webmaster.yandex.net/v4';
const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function yandexConfigured() {
  return Boolean(
    process.env.YANDEX_WEBMASTER_OAUTH_TOKEN?.trim()
    && (process.env.YANDEX_WEBMASTER_HOST_ID?.trim() || process.env.YANDEX_WEBMASTER_HOST_URL?.trim())
  );
}

function googleConfigured() {
  const key = process.env.GSC_PRIVATE_KEY?.trim() || '';
  return Boolean(
    process.env.GSC_SERVICE_ACCOUNT_EMAIL?.trim()
    && key.includes('BEGIN PRIVATE KEY')
    && !key.includes('...')
    && process.env.GSC_SITE_URL?.trim()
  );
}

function getSearchConfig() {
  return {
    yandex: yandexConfigured(),
    google: googleConfigured(),
    any: yandexConfigured() || googleConfigured(),
  };
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function yandexRequest(path, params = {}) {
  const token = process.env.YANDEX_WEBMASTER_OAUTH_TOKEN.trim();
  const res = await axios.get(`${YANDEX_API}${path}`, {
    headers: { Authorization: `OAuth ${token}` },
    params,
    timeout: 20000,
    validateStatus: () => true,
  });
  if (res.status >= 400) {
    const msg = res.data?.error_message || res.data?.error_code || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.code = res.data?.error_code;
    err.status = res.status;
    throw err;
  }
  return res.data;
}

function yandexHostPath(userId, hostId, suffix) {
  return `/user/${userId}/hosts/${encodeURIComponent(hostId)}${suffix}`;
}

async function resolveYandexUserId() {
  if (process.env.YANDEX_WEBMASTER_USER_ID?.trim()) {
    return process.env.YANDEX_WEBMASTER_USER_ID.trim();
  }
  const data = await yandexRequest('/user');
  return data?.user_id;
}

async function resolveYandexHostId(userId) {
  if (process.env.YANDEX_WEBMASTER_HOST_ID?.trim()) {
    return process.env.YANDEX_WEBMASTER_HOST_ID.trim();
  }
  const hostUrl = (process.env.YANDEX_WEBMASTER_HOST_URL || SITE_URL).trim();
  const data = await yandexRequest(`/user/${userId}/hosts`);
  const hosts = data?.hosts || [];
  const match = hosts.find((h) => {
    const ascii = (h.ascii_host_url || '').toLowerCase();
    const unicode = (h.unicode_host_url || '').toLowerCase();
    const target = hostUrl.toLowerCase().replace(/\/$/, '');
    return ascii.includes(target.replace('https://', '')) || unicode.includes(target.replace('https://', ''));
  });
  return match?.host_id || hosts[0]?.host_id || null;
}

async function fetchYandexMetrics(dateFrom, dateTo) {
  const userId = await resolveYandexUserId();
  const hostId = await resolveYandexHostId(userId);
  if (!hostId) throw new Error('Yandex Webmaster: host not found');

  const data = await yandexRequest(
    yandexHostPath(userId, hostId, '/search-queries/popular'),
    {
      date_from: dateFrom,
      date_to: dateTo,
      order_by: 'TOTAL_SHOWS',
      query_indicator: 'TOTAL_SHOWS',
      device_type_indicator: 'ALL',
    }
  );

  const queries = (data?.queries || []).map((row) => {
    const indicators = row.indicators || {};
    const shows = Number(indicators.TOTAL_SHOWS?.value ?? indicators.TOTAL_SHOWS ?? 0);
    const clicks = Number(indicators.TOTAL_CLICKS?.value ?? indicators.TOTAL_CLICKS ?? 0);
    const position = Number(indicators.AVG_SHOW_POSITION?.value ?? indicators.AVG_SHOW_POSITION ?? 0);
    return {
      query: row.query_text || row.query || '',
      page_url: row.url || null,
      impressions: shows,
      clicks,
      ctr: shows > 0 ? clicks / shows : 0,
      position: position || null,
    };
  });

  const totals = queries.reduce(
    (acc, q) => {
      acc.impressions += q.impressions;
      acc.clicks += q.clicks;
      if (q.position != null && q.impressions > 0) {
        acc.positionWeighted += q.position * q.impressions;
        acc.positionWeight += q.impressions;
      }
      return acc;
    },
    { impressions: 0, clicks: 0, positionWeighted: 0, positionWeight: 0 }
  );

  return {
    source: 'yandex',
    queries,
    totals: {
      impressions: totals.impressions,
      clicks: totals.clicks,
      ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0,
      avgPosition: totals.positionWeight > 0
        ? totals.positionWeighted / totals.positionWeight
        : null,
    },
  };
}

async function getGoogleAccessToken() {
  const email = process.env.GSC_SERVICE_ACCOUNT_EMAIL.trim();
  const key = process.env.GSC_PRIVATE_KEY.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: email,
      scope: GSC_SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    },
    key,
    { algorithm: 'RS256' }
  );
  const res = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
  );
  return res.data.access_token;
}

async function fetchGoogleMetrics(dateFrom, dateTo) {
  const token = await getGoogleAccessToken();
  const siteUrl = encodeURIComponent(process.env.GSC_SITE_URL.trim());
  const res = await axios.post(
    `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`,
    {
      startDate: dateFrom,
      endDate: dateTo,
      dimensions: ['query', 'page'],
      rowLimit: 250,
    },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }
  );

  const rows = res.data?.rows || [];
  const queries = rows.map((row) => {
    const impressions = Number(row.impressions || 0);
    const clicks = Number(row.clicks || 0);
    return {
      query: row.keys?.[0] || '',
      page_url: row.keys?.[1] || null,
      impressions,
      clicks,
      ctr: Number(row.ctr || (impressions > 0 ? clicks / impressions : 0)),
      position: Number(row.position || 0) || null,
    };
  });

  const totals = queries.reduce(
    (acc, q) => {
      acc.impressions += q.impressions;
      acc.clicks += q.clicks;
      if (q.position != null && q.impressions > 0) {
        acc.positionWeighted += q.position * q.impressions;
        acc.positionWeight += q.impressions;
      }
      return acc;
    },
    { impressions: 0, clicks: 0, positionWeighted: 0, positionWeight: 0 }
  );

  return {
    source: 'google',
    queries,
    totals: {
      impressions: totals.impressions,
      clicks: totals.clicks,
      ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0,
      avgPosition: totals.positionWeight > 0
        ? totals.positionWeighted / totals.positionWeight
        : null,
    },
  };
}

async function upsertDailyMetrics(db, date, source, totals) {
  await db.query(
    `INSERT INTO seo_metrics_daily (metric_date, source, impressions, clicks, ctr, avg_position, synced_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (metric_date, source) DO UPDATE SET
       impressions = EXCLUDED.impressions,
       clicks = EXCLUDED.clicks,
       ctr = EXCLUDED.ctr,
       avg_position = EXCLUDED.avg_position,
       synced_at = NOW()`,
    [
      date,
      source,
      totals.impressions,
      totals.clicks,
      totals.ctr,
      totals.avgPosition,
    ]
  );
}

async function replaceQueryStats(db, date, source, queries) {
  await db.query(
    'DELETE FROM seo_query_stats WHERE metric_date = $1 AND source = $2',
    [date, source]
  );
  const top = queries.slice(0, 500);
  for (const q of top) {
    if (!q.query) continue;
    await db.query(
      `INSERT INTO seo_query_stats
         (metric_date, source, query, page_url, impressions, clicks, ctr, position, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [date, source, q.query, q.page_url, q.impressions, q.clicks, q.ctr, q.position]
    );
  }
}

async function syncSearchMetrics(db, { days = 28 } = {}) {
  const config = getSearchConfig();
  const results = { yandex: null, google: null, errors: [] };
  const dateTo = todayStr();
  const dateFrom = daysAgo(days);

  if (config.yandex) {
    try {
      const data = await fetchYandexMetrics(dateFrom, dateTo);
      await upsertDailyMetrics(db, dateTo, 'yandex', data.totals);
      await replaceQueryStats(db, dateTo, 'yandex', data.queries);
      results.yandex = { ok: true, queries: data.queries.length, ...data.totals };
    } catch (err) {
      const hint = err.code === 'HOST_NOT_LOADED'
        ? 'Данные по woner.ru ещё не загружены в API Вебмастера — подождите 1–3 дня после подтверждения сайта'
        : err.message;
      results.errors.push({ source: 'yandex', message: hint, code: err.code || null });
    }
  }

  if (config.google) {
    try {
      const data = await fetchGoogleMetrics(dateFrom, dateTo);
      await upsertDailyMetrics(db, dateTo, 'google', data.totals);
      await replaceQueryStats(db, dateTo, 'google', data.queries);
      results.google = { ok: true, queries: data.queries.length, ...data.totals };
    } catch (err) {
      results.errors.push({ source: 'google', message: err.message });
    }
  }

  if (results.yandex || results.google) {
    const y = results.yandex || { impressions: 0, clicks: 0, avgPosition: null };
    const g = results.google || { impressions: 0, clicks: 0, avgPosition: null };
    const impressions = (y.impressions || 0) + (g.impressions || 0);
    const clicks = (y.clicks || 0) + (g.clicks || 0);
    const posParts = [y, g].filter((x) => x.avgPosition != null && x.impressions > 0);
    const posWeight = posParts.reduce((s, x) => s + x.impressions, 0);
    const avgPosition = posWeight > 0
      ? posParts.reduce((s, x) => s + x.avgPosition * x.impressions, 0) / posWeight
      : null;
    await upsertDailyMetrics(db, dateTo, 'combined', {
      impressions,
      clicks,
      ctr: impressions > 0 ? clicks / impressions : 0,
      avgPosition,
    });
  }

  try {
    const { runSeoIntelligence } = require('./seoIntelligence');
    results.intelligence = await runSeoIntelligence(db, { generatePages: true });
  } catch (err) {
    results.intelligenceError = err.message;
  }

  return { config, period: { from: dateFrom, to: dateTo }, ...results };
}

async function loadSearchMetrics(db, { days = 28 } = {}) {
  const config = getSearchConfig();
  const since = daysAgo(days);

  let daily = [];
  let topQueries = [];
  let latest = null;

  try {
    const dailyRes = await db.query(
      `SELECT metric_date, source, impressions, clicks, ctr, avg_position, synced_at
       FROM seo_metrics_daily
       WHERE source = 'combined' AND metric_date >= $1
       ORDER BY metric_date ASC`,
      [since]
    );
    daily = dailyRes.rows;

    if (!daily.length) {
      const fallback = await db.query(
        `SELECT metric_date, source, impressions, clicks, ctr, avg_position, synced_at
         FROM seo_metrics_daily
         WHERE metric_date >= $1
         ORDER BY metric_date DESC
         LIMIT 1`,
        [since]
      );
      latest = fallback.rows[0] || null;
    } else {
      latest = daily[daily.length - 1];
    }

    const queriesRes = await db.query(
      `SELECT source, query, page_url, impressions, clicks, ctr, position, metric_date
       FROM seo_query_stats
       WHERE metric_date >= $1
       ORDER BY clicks DESC, impressions DESC
       LIMIT 50`,
      [since]
    );
    topQueries = queriesRes.rows;
  } catch {
    /* tables may not exist yet */
  }

  const periodTotals = daily.reduce(
    (acc, row) => {
      acc.impressions += Number(row.impressions || 0);
      acc.clicks += Number(row.clicks || 0);
      return acc;
    },
    { impressions: 0, clicks: 0 }
  );
  periodTotals.ctr = periodTotals.impressions > 0
    ? periodTotals.clicks / periodTotals.impressions
    : 0;

  const positions = daily
    .map((r) => Number(r.avg_position))
    .filter((n) => Number.isFinite(n) && n > 0);
  periodTotals.avgPosition = positions.length
    ? positions.reduce((a, b) => a + b, 0) / positions.length
    : (latest?.avg_position != null ? Number(latest.avg_position) : null);

  if (!periodTotals.impressions && latest) {
    periodTotals.impressions = Number(latest.impressions || 0);
    periodTotals.clicks = Number(latest.clicks || 0);
    periodTotals.ctr = Number(latest.ctr || 0);
    periodTotals.avgPosition = latest.avg_position != null ? Number(latest.avg_position) : null;
  }

  return {
    configured: config,
    period: { from: since, to: todayStr() },
    totals: periodTotals,
    daily,
    topQueries,
    lastSyncedAt: latest?.synced_at || null,
  };
}

module.exports = {
  getSearchConfig,
  syncSearchMetrics,
  loadSearchMetrics,
};

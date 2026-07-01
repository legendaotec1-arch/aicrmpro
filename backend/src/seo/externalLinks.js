const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const {
  EXTERNAL_LINK_CATALOG,
  PLATFORM_LABELS,
  buildTrackedUrl,
} = require('./externalLinksCatalog');

async function ensureExternalLinksTable(dbConn = db) {
  try {
    await dbConn.query('SELECT 1 FROM seo_external_links LIMIT 1');
  } catch {
    const sqlPath = path.join(__dirname, '../db/migrations/038_seo_external_links.sql');
    await dbConn.query(fs.readFileSync(sqlPath, 'utf8'));
  }
}

function mapRow(row) {
  if (!row) return null;
  return {
    ...row,
    platformLabel: PLATFORM_LABELS[row.platform] || row.platform,
    trackedUrl: buildTrackedUrl(row.target_path, {
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
    }),
  };
}

async function seedExternalLinks(dbConn = db) {
  await ensureExternalLinksTable(dbConn);
  let inserted = 0;
  for (const item of EXTERNAL_LINK_CATALOG) {
    const res = await dbConn.query(
      `INSERT INTO seo_external_links (
         link_key, platform, link_type, title, target_path, anchor_text,
         priority, instructions, utm_source, utm_medium, utm_campaign, article_slug,
         auto_submit, api_endpoint, payload_template, content_template,
         submission_url, audience_size, domain_rating, requires_review, tags
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (link_key) DO UPDATE SET
         title = EXCLUDED.title,
         target_path = EXCLUDED.target_path,
         anchor_text = EXCLUDED.anchor_text,
         priority = EXCLUDED.priority,
         instructions = EXCLUDED.instructions,
         utm_source = EXCLUDED.utm_source,
         utm_medium = EXCLUDED.utm_medium,
         utm_campaign = EXCLUDED.utm_campaign,
         article_slug = EXCLUDED.article_slug,
         auto_submit = EXCLUDED.auto_submit,
         api_endpoint = EXCLUDED.api_endpoint,
         payload_template = EXCLUDED.payload_template,
         content_template = EXCLUDED.content_template,
         submission_url = EXCLUDED.submission_url,
         audience_size = EXCLUDED.audience_size,
         domain_rating = EXCLUDED.domain_rating,
         requires_review = EXCLUDED.requires_review,
         tags = EXCLUDED.tags,
         updated_at = NOW()
       RETURNING (xmax = 0) AS is_insert`,
      [
        item.link_key,
        item.platform,
        item.link_type,
        item.title,
        item.target_path || '/',
        item.anchor_text || null,
        item.priority ?? 5,
        item.instructions || null,
        item.utm_source || null,
        item.utm_medium || null,
        item.utm_campaign || null,
        item.article_slug || null,
        item.auto_submit || 'manual',
        item.api_endpoint || null,
        item.payload_template || null,
        item.content_template || null,
        item.submission_url || null,
        item.audience_size || null,
        item.domain_rating || null,
        item.requires_review === true,
        item.tags || null,
      ]
    );
    if (res.rows[0]?.is_insert) inserted += 1;
  }
  return { catalog: EXTERNAL_LINK_CATALOG.length, inserted };
}

async function listExternalLinks(dbConn = db, { platform, status } = {}) {
  await ensureExternalLinksTable(dbConn);
  const conditions = [];
  const values = [];
  let idx = 1;
  if (platform) {
    conditions.push(`platform = $${idx++}`);
    values.push(platform);
  }
  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await dbConn.query(
    `SELECT * FROM seo_external_links ${where}
     ORDER BY priority DESC, platform, title`,
    values
  );
  return res.rows.map(mapRow);
}

async function getExternalLinkStats(dbConn = db) {
  try {
    await ensureExternalLinksTable(dbConn);
  } catch {
    return { total: 0, live: 0, target: 30, progressPct: 0 };
  }
  const res = await dbConn.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'live')::int AS live,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'planned')::int AS planned,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
      COUNT(*) FILTER (WHERE platform = 'vc')::int AS vc,
      COUNT(*) FILTER (WHERE platform = 'dzen')::int AS dzen,
      COUNT(*) FILTER (WHERE platform = 'habr')::int AS habr,
      COUNT(*) FILTER (WHERE platform = 'catalog')::int AS catalogs,
      COUNT(*) FILTER (WHERE platform = 'partner')::int AS partners
    FROM seo_external_links
  `);
  const row = res.rows[0] || {};
  const target = 30;
  return {
    ...row,
    target,
    progressPct: Math.min(100, Math.round((row.live / target) * 100)),
    goalReached: row.live >= target,
  };
}

async function updateExternalLink(dbConn, id, patch) {
  const allowed = [
    'status',
    'external_url',
    'notes',
    'anchor_text',
    'submitted_at',
    'live_at',
    'last_attempt_at',
    'last_attempt_status',
    'last_attempt_message',
    'live_post_url',
    'external_url',
  ];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (patch[key] !== undefined) {
      sets.push(`${key} = $${idx++}`);
      values.push(patch[key]);
    }
  }
  if (!sets.length) return null;

  if (patch.status === 'live' && patch.live_at === undefined) {
    sets.push(`live_at = NOW()`);
  }
  if (patch.status === 'in_progress' && patch.submitted_at === undefined) {
    sets.push(`submitted_at = COALESCE(submitted_at, NOW())`);
  }
  sets.push('updated_at = NOW()');
  values.push(id);

  const res = await dbConn.query(
    `UPDATE seo_external_links SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return mapRow(res.rows[0]);
}

async function getLiveProfileUrls(dbConn = db) {
  const res = await dbConn.query(
    `SELECT external_url FROM seo_external_links
     WHERE status = 'live' AND external_url IS NOT NULL AND external_url <> ''
     ORDER BY priority DESC`
  );
  return res.rows.map((r) => r.external_url).filter(Boolean);
}

async function buildExternalLinksDashboard(dbConn = db) {
  const [stats, links] = await Promise.all([
    getExternalLinkStats(dbConn),
    listExternalLinks(dbConn),
  ]);

  const byPlatform = {};
  links.forEach((link) => {
    if (!byPlatform[link.platform]) {
      byPlatform[link.platform] = { label: link.platformLabel, items: [], live: 0 };
    }
    byPlatform[link.platform].items.push(link);
    if (link.status === 'live') byPlatform[link.platform].live += 1;
  });

  return { stats, byPlatform, links };
}

module.exports = {
  seedExternalLinks,
  listExternalLinks,
  getExternalLinkStats,
  updateExternalLink,
  getLiveProfileUrls,
  buildExternalLinksDashboard,
  buildTrackedUrl,
};

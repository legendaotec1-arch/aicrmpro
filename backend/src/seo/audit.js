const repo = require('./repository');
const { SITE_URL } = require('./config');

async function runSeoAudit(db) {
  const issues = [];
  const pages = await db.query(`SELECT slug, title, meta_description, h1 FROM seo_pages WHERE published = TRUE`);
  const rows = pages.rows;

  const titleMap = new Map();
  const descMap = new Map();

  rows.forEach((row) => {
    if (!row.h1?.trim()) {
      issues.push({ type: 'missing_h1', slug: row.slug, severity: 'error' });
    }
    if (!row.title?.trim()) {
      issues.push({ type: 'missing_title', slug: row.slug, severity: 'error' });
    }
    if (!row.meta_description?.trim()) {
      issues.push({ type: 'missing_description', slug: row.slug, severity: 'error' });
    } else if (row.meta_description.length < 50) {
      issues.push({ type: 'short_description', slug: row.slug, severity: 'warning' });
    }

    const t = row.title?.toLowerCase();
    if (t) {
      if (!titleMap.has(t)) titleMap.set(t, []);
      titleMap.get(t).push(row.slug);
    }
    const d = row.meta_description?.toLowerCase();
    if (d) {
      if (!descMap.has(d)) descMap.set(d, []);
      descMap.get(d).push(row.slug);
    }
  });

  const slugExtras = await db.query(
    `SELECT slug, extras FROM seo_pages WHERE published = TRUE`
  );
  const canonicalAliasSlugs = new Set(
    slugExtras.rows
      .filter((row) => {
        const extras = typeof row.extras === 'string' ? JSON.parse(row.extras) : (row.extras || {});
        return extras.canonicalSlug && extras.canonicalSlug !== row.slug;
      })
      .map((row) => row.slug)
  );

  const filterAliasGroup = (slugs) => slugs.filter((s) => !canonicalAliasSlugs.has(s));

  titleMap.forEach((slugs, title) => {
    const indexable = filterAliasGroup(slugs);
    if (indexable.length > 1) {
      issues.push({ type: 'duplicate_title', title, slugs: indexable, severity: 'warning' });
    }
  });
  descMap.forEach((slugs, description) => {
    const indexable = filterAliasGroup(slugs);
    if (indexable.length > 1) {
      issues.push({ type: 'duplicate_description', slugs: indexable, severity: 'info' });
    }
  });

  const brokenLinks = await db.query(
    `SELECT l.from_slug, l.to_slug FROM seo_internal_links l
     LEFT JOIN seo_pages p ON p.slug = l.to_slug
     WHERE p.slug IS NULL`
  );
  brokenLinks.rows.forEach((row) => {
    issues.push({
      type: 'broken_internal_link',
      from: row.from_slug,
      to: row.to_slug,
      severity: 'error',
    });
  });

  try {
    const mastersNoSlug = await db.query(
      `SELECT id FROM masters WHERE public_slug IS NULL LIMIT 500`
    );
    mastersNoSlug.rows.forEach((row) => {
      issues.push({ type: 'master_no_slug', masterId: row.id, severity: 'warning' });
    });

    const hiddenMasters = await db.query(
      `SELECT public_slug FROM masters WHERE public_indexable = FALSE AND public_slug IS NOT NULL`
    );
    hiddenMasters.rows.forEach((row) => {
      issues.push({ type: 'master_hidden', slug: row.public_slug, severity: 'info' });
    });

    const thinMasters = await db.query(
      `SELECT m.public_slug
       FROM masters m
       LEFT JOIN salon_masters sm ON sm.salon_id = m.id AND sm.is_active = TRUE
       LEFT JOIN price_items pi ON pi.salon_master_id = sm.id
       WHERE m.public_indexable IS NOT FALSE AND m.public_slug IS NOT NULL
       GROUP BY m.id, m.public_slug, m.description
       HAVING (m.description IS NULL OR TRIM(m.description) = '')
          AND COUNT(pi.id) = 0
       LIMIT 200`
    );
    thinMasters.rows.forEach((row) => {
      issues.push({ type: 'thin_master_page', slug: row.public_slug, severity: 'warning' });
    });
  } catch {
    /* masters SEO columns may be missing */
  }

  const summary = {
    pagesChecked: rows.length,
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    siteUrl: SITE_URL,
    checkedAt: new Date().toISOString(),
  };

  await db.query(
    `INSERT INTO seo_audit_reports (issues, summary) VALUES ($1, $2)`,
    [JSON.stringify(issues), JSON.stringify(summary)]
  );

  return { issues, summary };
}

async function getLatestAudit(db) {
  const res = await db.query(
    `SELECT run_at, issues, summary FROM seo_audit_reports ORDER BY run_at DESC LIMIT 1`
  );
  return res.rows[0] || null;
}

module.exports = { runSeoAudit, getLatestAudit };

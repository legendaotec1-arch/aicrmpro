const { SITE_URL, STATIC_ROUTES } = require('./config');

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function urlEntry(loc, { lastmod, changefreq, priority } = {}) {
  let xml = `  <url>\n    <loc>${escapeXml(loc)}</loc>\n`;
  if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
  if (changefreq) xml += `    <changefreq>${changefreq}</changefreq>\n`;
  if (priority != null) xml += `    <priority>${priority}</priority>\n`;
  xml += '  </url>\n';
  return xml;
}

function buildSitemapIndex(sitemaps) {
  const today = new Date().toISOString().slice(0, 10);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  sitemaps.forEach((sm) => {
    xml += '  <sitemap>\n';
    xml += `    <loc>${escapeXml(sm.loc)}</loc>\n`;
    xml += `    <lastmod>${sm.lastmod || today}</lastmod>\n`;
    xml += '  </sitemap>\n';
  });
  xml += '</sitemapindex>';
  return xml;
}

function buildUrlSet(urls) {
  const today = new Date().toISOString().slice(0, 10);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  urls.forEach((u) => {
    xml += urlEntry(u.loc, {
      lastmod: u.lastmod || today,
      changefreq: u.changefreq,
      priority: u.priority,
    });
  });
  xml += '</urlset>';
  return xml;
}

async function collectSitemapUrls(db) {
  const today = new Date().toISOString().slice(0, 10);

  const staticUrls = STATIC_ROUTES.map((r) => ({
    loc: `${SITE_URL}${r.path}`,
    changefreq: r.changefreq,
    priority: r.priority,
    lastmod: today,
  }));

  const pagesRes = await db.query(
    `SELECT slug, updated_at, priority, extras FROM seo_pages WHERE published = TRUE ORDER BY priority DESC`
  );

  const pageUrls = [];
  const geoUrls = [];
  for (const row of pagesRes.rows) {
    const basePriority = Number(row.priority) || 0.6;
    const isGeo = row.extras && row.extras.geoGenerated === true;
    const item = {
      loc: `${SITE_URL}/${row.slug}`,
      changefreq: isGeo ? 'weekly' : 'weekly',
      priority: isGeo ? Math.min(basePriority, 0.55) : basePriority,
      lastmod: row.updated_at ? new Date(row.updated_at).toISOString().slice(0, 10) : today,
    };
    if (isGeo) {
      geoUrls.push(item);
    } else {
      pageUrls.push(item);
    }
  }

  const articlesRes = await db.query(
    `SELECT slug, updated_at, published_at FROM seo_articles
     WHERE published = TRUE AND published_at <= NOW()
     ORDER BY published_at DESC`
  );
  const articleUrls = articlesRes.rows.map((row) => ({
    loc: `${SITE_URL}/blog/${row.slug}`,
    changefreq: 'monthly',
    priority: 0.55,
    lastmod: (row.published_at || row.updated_at)
      ? new Date(row.published_at || row.updated_at).toISOString().slice(0, 10)
      : today,
  }));

  let masterUrls = [];
  try {
    const mastersRes = await db.query(
      `SELECT public_slug, updated_at, created_at
       FROM masters
       WHERE public_indexable IS NOT FALSE
         AND public_slug IS NOT NULL
         AND (salon_name IS NOT NULL OR name IS NOT NULL)
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 10000`
    );
    masterUrls = mastersRes.rows.map((row) => ({
      loc: `${SITE_URL}/m/${row.public_slug}`,
      changefreq: 'weekly',
      priority: 0.55,
      lastmod: (row.updated_at || row.created_at)
        ? new Date(row.updated_at || row.created_at).toISOString().slice(0, 10)
        : today,
    }));
  } catch {
    /* ignore */
  }

  return { staticUrls, pageUrls, geoUrls, articleUrls, masterUrls };
}

async function buildSitemapIndexXml(db) {
  return buildSitemapIndex([
    { loc: `${SITE_URL}/sitemap-static.xml` },
    { loc: `${SITE_URL}/sitemap-pages.xml` },
    { loc: `${SITE_URL}/sitemap-geo.xml` },
    { loc: `${SITE_URL}/sitemap-blog.xml` },
    { loc: `${SITE_URL}/sitemap-masters.xml` },
  ]);
}

module.exports = {
  buildSitemapIndex,
  buildUrlSet,
  collectSitemapUrls,
  buildSitemapIndexXml,
};

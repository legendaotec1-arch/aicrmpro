const db = require('../config/database');

const PUBLISHED_ARTICLE_SQL = `published = TRUE AND published_at <= NOW()`;

async function getPageBySlug(slug) {
  const res = await db.query(
    `SELECT * FROM seo_pages WHERE slug = $1 AND published = TRUE`,
    [slug]
  );
  return res.rows[0] || null;
}

async function listPages({ cluster, pageType, limit = 200, offset = 0 } = {}) {
  const conditions = ['published = TRUE'];
  const values = [];
  let idx = 1;

  if (cluster) {
    conditions.push(`cluster = $${idx++}`);
    values.push(cluster);
  }
  if (pageType) {
    conditions.push(`page_type = $${idx++}`);
    values.push(pageType);
  }

  values.push(limit, offset);
  const res = await db.query(
    `SELECT slug, page_type, cluster, niche, title, meta_description, h1, intro, priority, updated_at
     FROM seo_pages WHERE ${conditions.join(' AND ')}
     ORDER BY priority DESC, slug ASC
     LIMIT $${idx++} OFFSET $${idx}`,
    values
  );
  return res.rows;
}

async function listPagesFull() {
  const res = await db.query(`SELECT slug, title, h1, cluster, page_type, niche FROM seo_pages WHERE published = TRUE`);
  return res.rows;
}

async function getArticleBySlug(slug) {
  const res = await db.query(
    `SELECT * FROM seo_articles WHERE slug = $1 AND ${PUBLISHED_ARTICLE_SQL}`,
    [slug]
  );
  return res.rows[0] || null;
}

async function listArticles({ category, limit = 50, offset = 0, includeScheduled = false } = {}) {
  const values = [];
  let where = includeScheduled ? 'published = TRUE' : PUBLISHED_ARTICLE_SQL;
  let idx = 1;
  if (category) {
    where += ` AND category = $${idx++}`;
    values.push(category);
  }
  values.push(limit, offset);
  const res = await db.query(
    `SELECT slug, category, title, meta_description, h1, intro, published_at
     FROM seo_articles WHERE ${where}
     ORDER BY published_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    values
  );
  return res.rows;
}

async function getInternalLinks(fromSlug) {
  const res = await db.query(
    `SELECT l.to_slug, l.anchor, l.weight, p.h1, p.title
     FROM seo_internal_links l
     LEFT JOIN seo_pages p ON p.slug = l.to_slug
     WHERE l.from_slug = $1
     ORDER BY l.weight DESC, l.anchor ASC`,
    [fromSlug]
  );
  return res.rows;
}

async function countPages() {
  const res = await db.query(`SELECT COUNT(*)::int AS c FROM seo_pages`);
  return res.rows[0]?.c || 0;
}

async function countLiveArticles() {
  const res = await db.query(`SELECT COUNT(*)::int AS c FROM seo_articles WHERE ${PUBLISHED_ARTICLE_SQL}`);
  return res.rows[0]?.c || 0;
}

async function countScheduledArticles() {
  const res = await db.query(
    `SELECT COUNT(*)::int AS c FROM seo_articles WHERE published = TRUE AND published_at > NOW()`
  );
  return res.rows[0]?.c || 0;
}

module.exports = {
  getPageBySlug,
  listPages,
  listPagesFull,
  getArticleBySlug,
  listArticles,
  getInternalLinks,
  countPages,
  countLiveArticles,
  countScheduledArticles,
};

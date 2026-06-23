const { SITE_URL, SITE_NAME } = require('./config');
const repo = require('./repository');

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function articleToDescription(article) {
  const intro = stripHtml(article.intro);
  if (intro.length > 50) return intro.slice(0, 500);
  const section = (article.sections || [])[0];
  if (section?.paragraphs?.[0]) {
    return stripHtml(section.paragraphs[0]).slice(0, 500);
  }
  return article.meta_description || '';
}

function articleToContent(article) {
  const parts = [];
  if (article.intro) parts.push(`<p>${escapeXml(stripHtml(article.intro))}</p>`);
  for (const section of article.sections || []) {
    if (section.heading) parts.push(`<h2>${escapeXml(section.heading)}</h2>`);
    for (const p of section.paragraphs || []) {
      parts.push(`<p>${escapeXml(stripHtml(p))}</p>`);
    }
    for (const item of section.bullets || []) {
      parts.push(`<li>${escapeXml(stripHtml(item))}</li>`);
    }
  }
  parts.push(
    `<p><em>Источник: <a href="${SITE_URL}/blog/${article.slug}">${SITE_NAME}</a></em></p>`
  );
  return parts.join('\n');
}

async function buildBlogRssFeed(db, { limit = 30 } = {}) {
  const rows = await repo.listArticles({ limit, offset: 0 });
  const items = [];

  for (const row of rows) {
    const full = await repo.getArticleBySlug(row.slug);
    if (!full) continue;
    const article = {
      ...full,
      sections: typeof full.sections === 'string' ? JSON.parse(full.sections) : full.sections,
    };
    const pubDate = new Date(article.published_at || Date.now()).toUTCString();
    const link = `${SITE_URL}/blog/${article.slug}`;
    items.push(`
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(articleToDescription(article))}</description>
      <content:encoded><![CDATA[${articleToContent(article)}]]></content:encoded>
    </item>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(SITE_NAME)} — блог для мастеров</title>
    <link>${SITE_URL}/blog</link>
    <description>CRM, онлайн-запись, Telegram и MAX для салонов красоты и мастеров услуг</description>
    <language>ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items.join('\n')}
  </channel>
</rss>`;
}

module.exports = { buildBlogRssFeed, articleToContent };

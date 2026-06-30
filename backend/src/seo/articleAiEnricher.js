const { isOpenRouterConfigured } = require('./openRouter');
const { generateSeoArticleWithAi } = require('./aiArticleWriter');
const { ARTICLES_PER_DAY } = require('./publicationSchedule');

const REQUEST_DELAY_MS = Number(process.env.OPENROUTER_REQUEST_DELAY_MS) || 4000;
const BATCH_LIMIT = Math.min(
  20,
  Math.max(1, Number(process.env.OPENROUTER_BATCH_SIZE) || ARTICLES_PER_DAY)
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchArticlesForAi(client, limit) {
  const res = await client.query(
    `SELECT slug, category, title, meta_description, h1, intro, sections, faq, toc, related_slugs, published_at
     FROM seo_articles
     WHERE published = TRUE
       AND content_source = 'template'
       AND published_at > NOW()
     ORDER BY published_at ASC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

async function saveAiArticle(client, slug, patch, relatedSlugs) {
  await client.query(
    `UPDATE seo_articles SET
       title = $2,
       meta_description = $3,
       h1 = $4,
       intro = $5,
       sections = $6::jsonb,
       faq = $7::jsonb,
       toc = $8::jsonb,
       content_source = 'ai',
       ai_model = $9,
       updated_at = NOW()
     WHERE slug = $1`,
    [
      slug,
      patch.title,
      patch.meta_description,
      patch.h1,
      patch.intro,
      JSON.stringify(patch.sections),
      JSON.stringify(patch.faq),
      JSON.stringify(patch.toc),
      patch.ai_model,
    ]
  );
}

/**
 * Генерирует AI-контент для ближайших статей в очереди публикации.
 * @returns {Promise<{ enriched: number, failed: number, skipped: boolean, errors: string[] }>}
 */
async function enrichUpcomingArticles(dbConn, limit = BATCH_LIMIT) {
  if (!isOpenRouterConfigured()) {
    return { enriched: 0, failed: 0, skipped: true, reason: 'no_api_key', errors: [] };
  }

  const client = await dbConn.connect();
  const errors = [];
  let enriched = 0;
  let failed = 0;

  try {
    const queue = await fetchArticlesForAi(client, limit);
    if (!queue.length) {
      return { enriched: 0, failed: 0, skipped: false, errors: [] };
    }

    for (const row of queue) {
      try {
        const patch = await generateSeoArticleWithAi(row);
        await saveAiArticle(client, row.slug, patch, row.related_slugs);
        enriched += 1;
        console.log(`[seo-ai] OK ${row.slug} (${patch.ai_model})`);
      } catch (err) {
        failed += 1;
        const msg = `${row.slug}: ${err.message}`;
        errors.push(msg);
        console.warn(`[seo-ai] FAIL ${msg}`);
      }
      await sleep(REQUEST_DELAY_MS);
    }

    return { enriched, failed, skipped: false, errors };
  } finally {
    client.release();
  }
}

async function countAiStats(dbConn) {
  const res = await dbConn.query(`
    SELECT
      COUNT(*) FILTER (WHERE content_source = 'ai')::int AS ai_total,
      COUNT(*) FILTER (WHERE content_source = 'template' AND published_at > NOW())::int AS template_pending,
      COUNT(*) FILTER (WHERE content_source = 'ai' AND published_at > NOW())::int AS ai_pending
    FROM seo_articles WHERE published = TRUE
  `);
  return res.rows[0];
}

module.exports = {
  enrichUpcomingArticles,
  countAiStats,
  BATCH_LIMIT,
};

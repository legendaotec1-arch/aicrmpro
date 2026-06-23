const db = require('../config/database');
const { generateNicheArticles } = require('./contentEngine');
const {
  buildSchedule,
  buildScheduleAfter,
  getLastScheduledDate,
  ARTICLES_PER_DAY,
} = require('./publicationSchedule');

async function upsertArticle(client, article, publishedAt) {
  await client.query(
    `INSERT INTO seo_articles (
       slug, category, title, meta_description, h1, intro, sections, faq, toc, related_slugs, published, published_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::timestamptz)
     ON CONFLICT (slug) DO UPDATE SET
       category = EXCLUDED.category,
       title = EXCLUDED.title,
       meta_description = EXCLUDED.meta_description,
       h1 = EXCLUDED.h1,
       intro = EXCLUDED.intro,
       sections = EXCLUDED.sections,
       faq = EXCLUDED.faq,
       toc = EXCLUDED.toc,
       related_slugs = EXCLUDED.related_slugs,
       published = EXCLUDED.published,
       updated_at = NOW()`,
    [
      article.slug,
      article.category,
      article.title,
      article.meta_description,
      article.h1,
      article.intro,
      JSON.stringify(article.sections),
      JSON.stringify(article.faq),
      JSON.stringify(article.toc),
      article.related_slugs,
      article.published,
      publishedAt,
    ]
  );
}

async function updateArticleContent(client, article) {
  await client.query(
    `UPDATE seo_articles SET
       category = $2, title = $3, meta_description = $4, h1 = $5,
       intro = $6, sections = $7, faq = $8, toc = $9, related_slugs = $10,
       published = TRUE, updated_at = NOW()
     WHERE slug = $1`,
    [
      article.slug,
      article.category,
      article.title,
      article.meta_description,
      article.h1,
      article.intro,
      JSON.stringify(article.sections),
      JSON.stringify(article.faq),
      JSON.stringify(article.toc),
      article.related_slugs,
    ]
  );
}

/** Синхронизирует каталог статей с БД; новые планируются по 2 в день */
async function syncArticlePipeline(dbConn = db) {
  const catalog = generateNicheArticles();
  const client = await dbConn.connect();

  try {
    await client.query('BEGIN');

    const existingRes = await client.query('SELECT slug FROM seo_articles');
    const existingSlugs = new Set(existingRes.rows.map((r) => r.slug));
    const newArticles = catalog.filter((a) => !existingSlugs.has(a.slug));

    if (newArticles.length) {
      const last = await getLastScheduledDate(client);
      const schedule = last
        ? buildScheduleAfter(newArticles.map((a) => a.slug), last)
        : buildSchedule(newArticles.map((a) => a.slug), new Date());

      for (const article of newArticles) {
        const publishedAt = schedule.get(article.slug) || new Date().toISOString();
        await upsertArticle(client, article, publishedAt);
      }
    }

    for (const article of catalog) {
      if (existingSlugs.has(article.slug)) {
        await updateArticleContent(client, article);
      }
    }

    await client.query('COMMIT');

    const stats = await dbConn.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE published_at <= NOW())::int AS live,
        COUNT(*) FILTER (WHERE published_at > NOW())::int AS scheduled
      FROM seo_articles WHERE published = TRUE
    `);

    const {
      notifyIndexNowLater,
      getRecentlyPublishedArticleUrls,
      getRecentlyUpdatedPageUrls,
    } = require('./indexNow');
    const recentUrls = [
      ...(await getRecentlyPublishedArticleUrls(dbConn)),
      ...(await getRecentlyUpdatedPageUrls(dbConn)),
    ];
    if (recentUrls.length) {
      notifyIndexNowLater(recentUrls, { logPrefix: '[indexnow] sync' });
    }

    return {
      catalog: catalog.length,
      added: newArticles.length,
      articlesPerDay: ARTICLES_PER_DAY,
      ...stats.rows[0],
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function startArticleCron() {
  const cron = require('node-cron');

  cron.schedule('5 5 * * *', async () => {
    try {
      const result = await syncArticlePipeline();
      if (result.added > 0) {
        console.log(
          `[seo-cron] +${result.added} articles (2/day). Live: ${result.live}, queued: ${result.scheduled}`
        );
      }
      const db = require('../config/database');
      const { notifyIndexNowLater, getRecentlyPublishedArticleUrls } = require('./indexNow');
      const urls = await getRecentlyPublishedArticleUrls(db, 26);
      if (urls.length) {
        notifyIndexNowLater(urls, { logPrefix: '[indexnow] cron' });
      }
    } catch (err) {
      console.error('[seo-cron] Article sync failed:', err.message);
    }
  });

  console.log('[seo-cron] Auto articles: 2/day, daily check 05:05 UTC');
}

module.exports = { syncArticlePipeline, startArticleCron, upsertArticle };

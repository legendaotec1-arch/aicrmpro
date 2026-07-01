const db = require('../config/database');
const { generateNicheArticles } = require('./contentEngine');
const {
  buildSchedule,
  buildScheduleAfter,
  getLastScheduledDate,
  reschedulePendingArticles,
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
  const existing = await client.query(
    `SELECT content_source FROM seo_articles WHERE slug = $1`,
    [article.slug]
  );
  if (existing.rows[0]?.content_source === 'ai') {
    return false;
  }

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
  return true;
}

/** Синхронизирует каталог статей с БД; новые планируются по SEO_ARTICLES_PER_DAY в день */
/** @param {{ enrichAi?: boolean }} [options] */
async function syncArticlePipeline(dbConn = db, { enrichAi = true } = {}) {
  const catalog = generateNicheArticles();
  const client = await dbConn.connect();
  let newArticles = [];

  try {
    await client.query('BEGIN');

    const existingRes = await client.query('SELECT slug FROM seo_articles');
    const existingSlugs = new Set(existingRes.rows.map((r) => r.slug));
    newArticles = catalog.filter((a) => !existingSlugs.has(a.slug));

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
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  let aiEnrichment = { enriched: 0, failed: 0, skipped: true };
  let pagesAiEnrichment = { enriched: 0, failed: 0, skipped: true };
  if (enrichAi) {
    try {
      const { enrichUpcomingArticles, enrichUpcomingPages } = require('./articleAiEnricher');
      aiEnrichment = await enrichUpcomingArticles(dbConn);
      // Докручиваем geo-страницы: 50 штук за один утренний прогон,
      // 2245 / 50 ≈ 45 прогонов = ~3 недели при ежедневном cron.
      pagesAiEnrichment = await enrichUpcomingPages(dbConn, 50, { geoOnly: true });
    } catch (err) {
      console.warn('[seo-cron] AI enrichment:', err.message);
      aiEnrichment = { enriched: 0, failed: 0, skipped: false, errors: [err.message] };
    }
  }

  try {
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
      aiEnrichment,
      pagesAiEnrichment,
      ...stats.rows[0],
    };
  } catch (err) {
    throw err;
  }
}

function startArticleCron() {
  const cron = require('node-cron');

  const runSync = async (label, enrichAi = false) => {
    try {
      const result = await syncArticlePipeline(undefined, { enrichAi });
      if (result.added > 0 || result.aiEnrichment?.enriched > 0) {
        console.log(
          `[seo-cron] ${label}: +${result.added} catalog, AI ${result.aiEnrichment?.enriched || 0} (${ARTICLES_PER_DAY}/day). Live: ${result.live}, queued: ${result.scheduled}`
        );
      }
      const db = require('../config/database');
      const { notifyIndexNowLater, getRecentlyPublishedArticleUrls } = require('./indexNow');
      const urls = await getRecentlyPublishedArticleUrls(db, 30);
      if (urls.length) {
        notifyIndexNowLater(urls, { logPrefix: `[indexnow] cron ${label}` });
      }
    } catch (err) {
      console.error(`[seo-cron] Article sync failed (${label}):`, err.message);
    }
  };

  // Утро UTC — синхронизация каталога + AI-контент на день
  cron.schedule('5 5 * * *', () => runSync('05:05', true));
  // Вечер UTC — только синхронизация шаблонов
  cron.schedule('5 17 * * *', () => runSync('17:05', false));

  // Автосабмит внешних площадок: 3 площадки в день, пн-пт в 11:00 UTC
  cron.schedule('0 11 * * 1-5', async () => {
    try {
      const { runAutoSubmitBatch } = require('./autoSubmit/orchestrator');
      const r = await runAutoSubmitBatch({ limit: 3, platforms: ['reddit', 'telegram', 'vk', 'social'] });
      console.log(`[auto-submit cron] ${r.total} platforms processed`);
    } catch (err) {
      console.error('[auto-submit cron] failed:', err.message);
    }
  });

  console.log(`[seo-cron] Auto articles: ${ARTICLES_PER_DAY}/day, AI batch morning, sync 05:05 & 17:05 UTC, auto-submit 11:00 UTC weekdays`);
}

module.exports = { syncArticlePipeline, startArticleCron, upsertArticle, reschedulePendingArticles };

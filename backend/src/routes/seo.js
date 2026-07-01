const express = require('express');
const db = require('../config/database');
const repo = require('../seo/repository');
const { seedSeoContent } = require('../seo/seed');
const { runSeoAudit, getLatestAudit } = require('../seo/audit');
const { buildSeoDashboard } = require('../seo/dashboard');
const { syncSearchMetrics } = require('../seo/searchMetrics');
const { buildRobotsTxt } = require('../seo/robots');
const {
  buildUrlSet,
  collectSitemapUrls,
  buildSitemapIndexXml,
} = require('../seo/sitemap');
const { buildPageJsonLd, buildArticleJsonLd } = require('../seo/jsonld');
const { SITE_URL, CLUSTERS, BLOG_CATEGORIES } = require('../seo/config');
const { NICHE_CATALOG } = require('../seo/niches');
const { adminAuthMiddleware } = require('../utils/adminAuth');

const CATEGORY_LABELS = {
  beauty: 'Бьюти и красота',
  medical: 'Медицина и здоровье',
  education: 'Образование',
  fitness: 'Фитнес и спорт',
  auto: 'Автоуслуги',
  services: 'Услуги и сервис',
};

const router = express.Router();

function mapPage(row) {
  if (!row) return null;
  const extras = typeof row.extras === 'string' ? JSON.parse(row.extras) : (row.extras || {});
  const canonicalSlug = extras.canonicalSlug || row.slug;
  return {
    ...row,
    sections: typeof row.sections === 'string' ? JSON.parse(row.sections) : row.sections,
    faq: typeof row.faq === 'string' ? JSON.parse(row.faq) : row.faq,
    toc: typeof row.toc === 'string' ? JSON.parse(row.toc) : (row.toc || []),
    extras,
    canonicalUrl: `${SITE_URL}/${canonicalSlug}`,
    related_slugs: row.related_slugs || [],
  };
}

function mapArticle(row) {
  if (!row) return null;
  return {
    ...row,
    sections: typeof row.sections === 'string' ? JSON.parse(row.sections) : row.sections,
    faq: typeof row.faq === 'string' ? JSON.parse(row.faq) : row.faq,
    toc: typeof row.toc === 'string' ? JSON.parse(row.toc) : row.toc,
    related_slugs: row.related_slugs || [],
  };
}

router.get('/page/:slug', async (req, res) => {
  try {
    const page = mapPage(await repo.getPageBySlug(req.params.slug));
    if (!page) return res.status(404).json({ error: 'Страница не найдена' });

    const links = await repo.getInternalLinks(page.slug);
    const breadcrumbs = [
      { name: 'Главная', url: SITE_URL },
      { name: 'Решения', url: `${SITE_URL}/resheniya` },
      { name: page.h1, url: `${SITE_URL}/${page.slug}` },
    ];
    const jsonLd = buildPageJsonLd(page, breadcrumbs);

    res.json({ page, internalLinks: links, breadcrumbs, jsonLd });
  } catch (err) {
    console.error('SEO page:', err);
    res.status(500).json({ error: 'Ошибка загрузки страницы' });
  }
});

router.get('/pages', async (req, res) => {
  try {
    const pages = await repo.listPages({
      cluster: req.query.cluster,
      pageType: req.query.type,
      limit: Math.min(Number(req.query.limit) || 100, 500),
    });
    res.json({ pages, clusters: CLUSTERS });
  } catch (err) {
    console.error('SEO pages list:', err);
    res.status(500).json({ error: 'Ошибка загрузки списка' });
  }
});

router.get('/article/:slug', async (req, res) => {
  try {
    const article = mapArticle(await repo.getArticleBySlug(req.params.slug));
    if (!article) return res.status(404).json({ error: 'Статья не найдена' });

    const breadcrumbs = [
      { name: 'Главная', url: SITE_URL },
      { name: 'Блог', url: `${SITE_URL}/blog` },
      { name: article.h1, url: `${SITE_URL}/blog/${article.slug}` },
    ];
    const jsonLd = buildArticleJsonLd(article, breadcrumbs);

    res.json({ article, breadcrumbs, jsonLd });
  } catch (err) {
    console.error('SEO article:', err);
    res.status(500).json({ error: 'Ошибка загрузки статьи' });
  }
});

router.get('/articles', async (req, res) => {
  try {
    const articles = await repo.listArticles({
      category: req.query.category,
      limit: Math.min(Number(req.query.limit) || 50, 500),
    });
    res.json({ articles, categories: BLOG_CATEGORIES });
  } catch (err) {
    console.error('SEO articles:', err);
    res.status(500).json({ error: 'Ошибка загрузки статей' });
  }
});

router.get('/hub', async (_req, res) => {
  try {
    const [crm, booking, beauty, articles] = await Promise.all([
      repo.listPages({ cluster: 'crm', limit: 12 }),
      repo.listPages({ cluster: 'booking', limit: 12 }),
      repo.listPages({ cluster: 'beauty', limit: 12 }),
      repo.listArticles({ limit: 6 }),
    ]);
    res.json({ clusters: CLUSTERS, crm, booking, beauty, articles });
  } catch (err) {
    console.error('SEO hub:', err);
    res.status(500).json({ error: 'Ошибка загрузки хаба' });
  }
});

router.get('/hub/resheniya', async (_req, res) => {
  try {
    const [solutions, crm, booking, features, compare] = await Promise.all([
      repo.listPages({ pageType: 'solution', limit: 30 }),
      repo.listPages({ cluster: 'crm', limit: 500 }),
      repo.listPages({ cluster: 'booking', limit: 500 }),
      repo.listPages({ pageType: 'feature', limit: 150 }),
      repo.listPages({ pageType: 'compare', limit: 20 }),
    ]);

    const crmNiche = crm.filter((p) => p.page_type === 'programmatic' && p.slug.startsWith('crm-dlya-'));
    const bookingNiche = booking.filter((p) => p.page_type === 'programmatic');

    res.json({
      solutions,
      crmCore: crm.filter((p) => p.page_type === 'solution'),
      crmNiche,
      bookingCore: booking.filter((p) => p.page_type === 'solution'),
      bookingNiche,
      features,
      compare,
    });
  } catch (err) {
    console.error('SEO hub resheniya:', err);
    res.status(500).json({ error: 'Ошибка загрузки решений' });
  }
});

router.get('/hub/otrasli', async (_req, res) => {
  try {
    const pages = await repo.listPages({ limit: 500 });
    const nicheMap = Object.fromEntries(NICHE_CATALOG.map((n) => [n.id, n]));
    const groups = {};

    for (const p of pages) {
      if (!p.niche) continue;
      const n = nicheMap[p.niche];
      if (!n) continue;
      const cat = n.category;
      if (!groups[cat]) {
        groups[cat] = { id: cat, label: CATEGORY_LABELS[cat] || cat, niches: {} };
      }
      if (!groups[cat].niches[n.id]) {
        groups[cat].niches[n.id] = {
          id: n.id,
          label: n.genitive,
          slugBase: n.slugBase,
          pages: [],
        };
      }
      const allowed = [
        `crm-dlya-${n.slugBase}`,
        `online-zapis-dlya-${n.slugBase}`,
      ];
      if (n.bookingNa) allowed.push(`online-zapis-na-${n.bookingNa.slug}`);
      if (n.bookingV) allowed.push(`online-zapis-v-${n.bookingV.slug}`);
      if (n.bookingK) allowed.push(`online-zapis-k-${n.bookingK.slug}`);
      if (allowed.includes(p.slug)) {
        groups[cat].niches[n.id].pages.push({
          slug: p.slug,
          h1: p.h1,
          cluster: p.cluster,
        });
      }
    }

    const industries = Object.values(groups)
      .map((g) => ({
        ...g,
        niches: Object.values(g.niches).sort((a, b) => a.label.localeCompare(b.label, 'ru')),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

    res.json({ industries, categories: CATEGORY_LABELS });
  } catch (err) {
    console.error('SEO hub otrasli:', err);
    res.status(500).json({ error: 'Ошибка загрузки отраслей' });
  }
});

router.post('/seed', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await seedSeoContent({ force: Boolean(req.body?.force) });
    res.json(result);
  } catch (err) {
    console.error('SEO seed:', err);
    res.status(500).json({ error: 'Ошибка генерации SEO-страниц' });
  }
});

router.post('/audit', adminAuthMiddleware, async (_req, res) => {
  try {
    const report = await runSeoAudit(db);
    res.json(report);
  } catch (err) {
    console.error('SEO audit:', err);
    res.status(500).json({ error: 'Ошибка аудита' });
  }
});

router.get('/audit/latest', adminAuthMiddleware, async (_req, res) => {
  try {
    const report = await getLatestAudit(db);
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки аудита' });
  }
});

router.get('/dashboard', adminAuthMiddleware, async (_req, res) => {
  try {
    const dashboard = await buildSeoDashboard(db);
    res.json(dashboard);
  } catch (err) {
    console.error('SEO dashboard:', err);
    res.status(500).json({ error: 'Ошибка загрузки SEO-панели' });
  }
});

router.post('/metrics/sync', adminAuthMiddleware, async (req, res) => {
  try {
    const days = Math.min(Number(req.body?.days) || 28, 90);
    const result = await syncSearchMetrics(db, { days });
    const dashboard = await buildSeoDashboard(db);
    res.json({ sync: result, dashboard });
  } catch (err) {
    console.error('SEO metrics sync:', err);
    res.status(500).json({ error: err.message || 'Ошибка синхронизации метрик' });
  }
});

router.post('/articles/sync', adminAuthMiddleware, async (req, res) => {
  try {
    const { syncArticlePipeline, reschedulePendingArticles } = require('../seo/articleCron');
    const { ensurePublicationSchedule } = require('../seo/publicationSchedule');
    const result = await syncArticlePipeline(db, { enrichAi: req.body?.enrichAi === true });
    if (req.body?.reschedule) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const pub = req.body.reschedule === 'all'
          ? await ensurePublicationSchedule(client, { force: true })
          : await reschedulePendingArticles(client);
        await client.query('COMMIT');
        result.rescheduled = pub.rescheduled;
        result.articlesPerDay = pub.articlesPerDay;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
    res.json(result);
  } catch (err) {
    console.error('SEO article sync:', err);
    res.status(500).json({ error: err.message || 'Ошибка синхронизации статей' });
  }
});

router.get('/articles/stats', adminAuthMiddleware, async (_req, res) => {
  try {
    const { ARTICLES_PER_DAY } = require('../seo/publicationSchedule');
    const { generateNicheArticles } = require('../seo/contentEngine');
    const { countAiStats, BATCH_LIMIT } = require('../seo/articleAiEnricher');
    const { isOpenRouterConfigured } = require('../seo/openRouter');
    const stats = await db.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE published_at <= NOW())::int AS live,
        COUNT(*) FILTER (WHERE published_at > NOW())::int AS scheduled
      FROM seo_articles WHERE published = TRUE
    `);
    const ai = await countAiStats(db);
    const next = await db.query(
      `SELECT slug, published_at, content_source, ai_model FROM seo_articles
       WHERE published = TRUE AND published_at > NOW()
       ORDER BY published_at ASC LIMIT 5`
    );
    res.json({
      articlesPerDay: ARTICLES_PER_DAY,
      catalogSize: generateNicheArticles().length,
      aiBatchSize: BATCH_LIMIT,
      openRouterConfigured: isOpenRouterConfigured(),
      ...stats.rows[0],
      ...ai,
      nextPublications: next.rows,
    });
  } catch (err) {
    console.error('SEO article stats:', err);
    res.status(500).json({ error: err.message || 'Ошибка загрузки статистики блога' });
  }
});

router.post('/articles/ai-generate', adminAuthMiddleware, async (req, res) => {
  const { enrichUpcomingArticles, BATCH_LIMIT } = require('../seo/articleAiEnricher');
  const limit = Math.min(Number(req.body?.limit) || BATCH_LIMIT, 20);

  // Запускаем в фоне — без этого браузер закрывает соединение до того, как
  // мы успеваем ответить, и фронт показывает «Ошибка AI-генерации».
  const jobId = `ai-gen-${Date.now()}`;
  res.json({
    started: true,
    jobId,
    limit,
    message: 'Запущено в фоне, обновите статистику через ~30 сек'
  });

  setImmediate(async () => {
    const startedAt = Date.now();
    console.log(`[seo-ai] job ${jobId} start limit=${limit}`);
    try {
      const result = await enrichUpcomingArticles(db, limit);
      const statsRes = await db.query(`
        SELECT COUNT(*) FILTER (WHERE content_source = 'ai')::int AS ai_total
        FROM seo_articles WHERE published = TRUE
      `);
      console.log(
        `[seo-ai] job ${jobId} done in ${Math.round((Date.now() - startedAt) / 1000)}s ` +
        `enriched=${result.enriched} failed=${result.failed} ` +
        `errors=${JSON.stringify((result.errors || []).slice(0, 3))}`
      );
    } catch (err) {
      console.error(`[seo-ai] job ${jobId} crash:`, err);
    }
  });
});

router.get('/press', async (_req, res) => {
  try {
    const { getPressKit } = require('../seo/pressKit');
    res.json(getPressKit());
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки пресс-кита' });
  }
});

router.get('/external-links', adminAuthMiddleware, async (_req, res) => {
  try {
    const { buildExternalLinksDashboard } = require('../seo/externalLinks');
    res.json(await buildExternalLinksDashboard(db));
  } catch (err) {
    console.error('SEO external links:', err);
    res.status(500).json({ error: 'Ошибка загрузки внешних ссылок' });
  }
});

router.patch('/external-links/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { updateExternalLink } = require('../seo/externalLinks');
    const updated = await updateExternalLink(db, req.params.id, req.body || {});
    if (!updated) return res.status(400).json({ error: 'Нет данных для обновления' });
    res.json(updated);
  } catch (err) {
    console.error('SEO external link update:', err);
    res.status(500).json({ error: 'Ошибка обновления' });
  }
});

router.post('/external-links/seed', adminAuthMiddleware, async (_req, res) => {
  try {
    const { seedExternalLinks } = require('../seo/externalLinks');
    const result = await seedExternalLinks(db);
    const { buildExternalLinksDashboard } = require('../seo/externalLinks');
    const dashboard = await buildExternalLinksDashboard(db);
    res.json({ seed: result, ...dashboard });
  } catch (err) {
    console.error('SEO external links seed:', err);
    res.status(500).json({ error: 'Ошибка инициализации каталога' });
  }
});

// ===== Auto-submit: автоматическая публикация на внешних площадках =====

router.post('/auto-submit/run', adminAuthMiddleware, async (req, res) => {
  try {
    const { runAutoSubmitBatch } = require('../seo/autoSubmit/orchestrator');
    const { limit, platform, dryRun } = req.body || {};
    const platforms = platform ? (Array.isArray(platform) ? platform : platform.split(',').map((s) => s.trim())) : null;
    const result = await runAutoSubmitBatch({
      limit: limit || 5,
      platforms,
      dryRun: !!dryRun,
    });
    res.json(result);
  } catch (err) {
    console.error('SEO auto-submit:', err);
    res.status(500).json({ error: err.message || 'Ошибка автосабмита' });
  }
});

router.post('/auto-submit/link', adminAuthMiddleware, async (req, res) => {
  try {
    const { submitLink, previewLink } = require('../seo/autoSubmit/orchestrator');
    const { link_key, dryRun } = req.body || {};
    if (!link_key) return res.status(400).json({ error: 'link_key обязателен' });
    const r = await db.query('SELECT * FROM seo_external_links WHERE link_key = $1', [link_key]);
    if (!r.rows.length) return res.status(404).json({ error: 'площадка не найдена' });
    const link = r.rows[0];
    if (dryRun) {
      res.json({ mode: 'preview', preview: await previewLink(link) });
    } else {
      res.json({ mode: 'submit', result: await submitLink(link) });
    }
  } catch (err) {
    console.error('SEO auto-submit link:', err);
    res.status(500).json({ error: err.message || 'Ошибка' });
  }
});

router.get('/auto-submit/adapters', adminAuthMiddleware, async (_req, res) => {
  res.json({
    adapters: [
      { id: 'reddit', name: 'Reddit', env: ['REDDIT_OAUTH_TOKEN', 'REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_USERNAME', 'REDDIT_PASSWORD'], requiresReview: false },
      { id: 'telegram', name: 'Telegram', env: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID'], requiresReview: false },
      { id: 'vk', name: 'ВКонтакте', env: ['VK_ACCESS_TOKEN', 'VK_OWNER_ID'], requiresReview: false },
      { id: 'press-feed', name: 'Press-feed', env: ['PRESS_FEED_API_KEY', 'PRESS_FEED_CONTACT_EMAIL'], requiresReview: true },
      { id: 'producthunt', name: 'Product Hunt', env: ['PRODUCTHUNT_DEVELOPER_TOKEN'], requiresReview: true },
      { id: 'github', name: 'GitHub Profile', env: ['GITHUB_TOKEN', 'GITHUB_USERNAME'], requiresReview: false },
      { id: 'medium', name: 'Medium', env: ['MEDIUM_INTEGRATION_TOKEN'], requiresReview: false },
      { id: 'linkedin', name: 'LinkedIn', env: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_URN'], requiresReview: true },
      { id: 'twitter', name: 'Twitter / X', env: ['TWITTER_BEARER_TOKEN'], requiresReview: false },
      { id: 'pinterest', name: 'Pinterest', env: ['PINTEREST_ACCESS_TOKEN', 'PINTEREST_BOARD_ID'], requiresReview: false },
      { id: 'tumblr', name: 'Tumblr', env: ['TUMBLR_OAUTH_TOKEN'], requiresReview: false },
      { id: 'mastodon', name: 'Mastodon', env: ['MASTODON_ACCESS_TOKEN', 'MASTODON_INSTANCE'], requiresReview: false },
      { id: 'threads', name: 'Threads', env: ['THREADS_ACCESS_TOKEN', 'THREADS_USER_ID'], requiresReview: false },
      { id: 'bluesky', name: 'Bluesky', env: ['BLUESKY_HANDLE', 'BLUESKY_APP_PASSWORD'], requiresReview: false },
      { id: 'pocket', name: 'Pocket', env: ['POCKET_ACCESS_TOKEN'], requiresReview: false },
      { id: 'raindrop', name: 'Raindrop.io', env: ['RAINDROP_TOKEN'], requiresReview: false },
      { id: 'diigo', name: 'Diigo', env: ['DIIGO_API_KEY', 'DIIGO_USER'], requiresReview: false },
      { id: 'delicious', name: 'Delicious', env: ['DELICIOUS_USER', 'DELICIOUS_PASSWORD'], requiresReview: false },
      { id: 'mix', name: 'Mix (StumbleUpon)', env: ['MIX_TOKEN'], requiresReview: false },
    ],
  });
});

router.get('/intelligence', adminAuthMiddleware, async (_req, res) => {
  try {
    const { loadIntelligenceDashboard } = require('../seo/seoIntelligence');
    res.json(await loadIntelligenceDashboard(db));
  } catch (err) {
    console.error('SEO intelligence:', err);
    res.status(500).json({ error: 'Ошибка загрузки SEO-аналитики' });
  }
});

router.post('/intelligence/run', adminAuthMiddleware, async (req, res) => {
  try {
    const { runSeoIntelligence } = require('../seo/seoIntelligence');
    const result = await runSeoIntelligence(db, {
      generatePages: req.body?.generatePages !== false,
    });
    const generated = result.pagesGenerated?.slugs;
    if (generated?.length) {
      const { notifyIndexNowLater, pathsFromSlugs } = require('../seo/indexNow');
      notifyIndexNowLater(pathsFromSlugs(generated), { logPrefix: '[indexnow] intel' });
    }
    res.json(result);
  } catch (err) {
    console.error('SEO intelligence run:', err);
    res.status(500).json({ error: err.message || 'Ошибка анализа' });
  }
});

router.get('/indexnow/status', adminAuthMiddleware, async (_req, res) => {
  const { getIndexNowStatus } = require('../seo/indexNow');
  res.json(getIndexNowStatus());
});

router.post('/indexnow/submit', adminAuthMiddleware, async (req, res) => {
  try {
    const { notifyIndexNow, getSitemapUrlsForIndexNow, getRecentlyPublishedArticleUrls, getRecentlyUpdatedPageUrls, absoluteUrl } = require('../seo/indexNow');
    const scope = req.body?.scope || 'recent';

    let urls = [];
    if (Array.isArray(req.body?.urls) && req.body.urls.length) {
      urls = req.body.urls.map(absoluteUrl).filter(Boolean);
    } else if (scope === 'sitemap') {
      urls = await getSitemapUrlsForIndexNow(db);
    } else {
      urls = [
        ...(await getRecentlyPublishedArticleUrls(db, 24 * 30)),
        ...(await getRecentlyUpdatedPageUrls(db, 24 * 30)),
      ];
      if (!urls.length) {
        urls = await getSitemapUrlsForIndexNow(db);
      }
    }

    const result = await notifyIndexNow(urls, { logPrefix: '[indexnow] manual' });
    res.json(result);
  } catch (err) {
    console.error('IndexNow submit:', err);
    res.status(500).json({ error: err.message || 'Ошибка IndexNow' });
  }
});

module.exports = { router, buildRobotsTxt, buildSitemapIndexXml, collectSitemapUrls, buildUrlSet };

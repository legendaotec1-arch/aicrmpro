const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { uploadsDir, frontendDist } = require('./config/paths');
const { setStaticCacheHeaders, sendSpaIndex } = require('./utils/staticCache');
const { readAppAssets } = require('./utils/appAssets');
const { seedSeoContent } = require('./seo/seed');
const {
  router: seoApiRouter,
  buildRobotsTxt,
  buildSitemapIndexXml,
  collectSitemapUrls,
  buildUrlSet,
} = require('./routes/seo');
const { sendSpaIndexWithSeo } = require('./seo/spaSeo');
const { registerIndexNowKeyRoute } = require('./seo/indexNow');

// Load environment variables
dotenv.config();

const { assertSecurityEnv } = require('./utils/jwtConfig');
if (process.env.NODE_ENV === 'production') {
  assertSecurityEnv();
}

const { createCorsOriginChecker } = require('./utils/corsOrigins');

const app = express();
const PORT = process.env.PORT || 3000;

// Auto-delete past schedule exceptions on startup
async function cleanupPastScheduleExceptionsOnStartup() {
  try {
    const db = require('./config/database');
    const { cleanupPastScheduleExceptions } = require('./utils/scheduleExceptions');
    const removed = await cleanupPastScheduleExceptions(db);
    if (removed > 0) {
      console.log(`[cleanup] Removed ${removed} past schedule exception(s)`);
    }
  } catch (err) {
    console.error('[cleanup] Failed to delete past schedule exceptions:', err.message);
  }
}

// Middleware
app.use(cors({
  origin: createCorsOriginChecker(),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads; missing files → 404 (не index.html SPA)
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',
  etag: true,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'public, max-age=604800');
  },
}));
app.use('/uploads', (_req, res) => {
  res.status(404).json({ error: 'File not found' });
});

// Serve static files from frontend build
app.use(
  express.static(frontendDist, {
    etag: false,
    lastModified: false,
    setHeaders: setStaticCacheHeaders
  })
);

// Import routes
const authRoutes = require('./routes/auth');
const masterRoutes = require('./routes/master');
const clientRoutes = require('./routes/client');
const appointmentRoutes = require('./routes/appointment');
const billingRoutes = require('./routes/billing');
const adminRoutes = require('./routes/admin');
const partnerRoutes = require('./routes/partner');

// SEO seed on startup
async function initSeo() {
  try {
    const { backfillMasterSlugs } = require('./seo/masterSeo');
    const slugs = await backfillMasterSlugs();
    if (slugs > 0) {
      console.log(`[seo] Backfilled ${slugs} master public slugs`);
    }
  } catch (err) {
    console.error('[seo] Master slug backfill failed:', err.message);
  }

  try {
    const result = await seedSeoContent();
    if (result.seeded) {
      const pub = result.publication?.rescheduled
        ? `, расписание: ${result.publication.rescheduled} статей (2/день)`
        : '';
      const live = result.articlesLive != null ? `, live ${result.articlesLive}` : '';
      const queued = result.articlesScheduled != null ? `, в очереди ${result.articlesScheduled}` : '';
      const added = result.articlesAdded > 0 ? ` (+${result.articlesAdded} новых)` : '';
      console.log(
        `[seo] ${result.pages} pages, ${result.articles} articles${added}${live}${queued}${pub}`
      );
    }
  } catch (err) {
    console.error('[seo] Seed failed:', err.message);
  }

  try {
    const { startArticleCron } = require('./seo/articleCron');
    startArticleCron();
  } catch (err) {
    console.error('[seo] Article cron failed:', err.message);
  }

  try {
    const { seedExternalLinks } = require('./seo/externalLinks');
    const ext = await seedExternalLinks();
    if (ext.inserted > 0) {
      console.log(`[seo] External links catalog: +${ext.inserted} targets (${ext.catalog} total)`);
    }
  } catch (err) {
    console.error('[seo] External links seed failed:', err.message);
  }

  try {
    const db = require('./config/database');
    const { runSeoIntelligence } = require('./seo/seoIntelligence');
    const intel = await runSeoIntelligence(db, { generatePages: true });
    const pg = intel.pagesGenerated?.generated || 0;
    console.log(
      `[seo-intel] ${intel.clusters.total} clusters, ${intel.contentGaps.recommendations} рекомендаций, ${intel.contentGaps.zeroImpressions} стр. без показов${pg ? `, +${pg} посадочных` : ''}`
    );
  } catch (err) {
    console.error('[seo] Intelligence failed:', err.message);
  }

  try {
    const { ensurePartnerSchema } = require('./utils/partnerProgram');
    const { ensureMasterEmailSchema } = require('./utils/masterEmailAuth');
    await ensurePartnerSchema();
    await ensureMasterEmailSchema();
    console.log('[partner] Schema ready');
  } catch (err) {
    console.error('[partner] Schema failed:', err.message);
  }
}

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/seo', seoApiRouter);

app.get('/r/:code', (req, res) => {
  const base = (process.env.PUBLIC_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  res.redirect(302, `${base}/register?ref=${encodeURIComponent(req.params.code)}`);
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(buildRobotsTxt());
});

app.get('/favicon.ico', (_req, res) => {
  const faviconPath = path.join(frontendDist, 'favicon.png');
  if (!fs.existsSync(faviconPath)) {
    return res.status(404).end();
  }
  res.type('image/png');
  res.sendFile(faviconPath);
});

registerIndexNowKeyRoute(app);

app.get('/sitemap.xml', async (_req, res) => {
  try {
    const xml = await buildSitemapIndexXml(require('./config/database'));
    res.type('application/xml').send(xml);
  } catch (err) {
    console.error('sitemap index:', err);
    res.status(500).type('text/plain').send('Sitemap error');
  }
});

async function sendSitemapPart(req, res, part) {
  try {
    const db = require('./config/database');
    const { staticUrls, pageUrls, articleUrls, masterUrls } = await collectSitemapUrls(db);
    const map = {
      static: staticUrls,
      pages: pageUrls,
      blog: articleUrls,
      masters: masterUrls,
    };
    res.type('application/xml').send(buildUrlSet(map[part] || []));
  } catch (err) {
    console.error(`sitemap-${part}:`, err);
    res.status(500).send('Sitemap error');
  }
}

app.get('/sitemap-static.xml', (req, res) => sendSitemapPart(req, res, 'static'));
app.get('/sitemap-pages.xml', (req, res) => sendSitemapPart(req, res, 'pages'));
app.get('/sitemap-blog.xml', (req, res) => sendSitemapPart(req, res, 'blog'));
app.get('/sitemap-masters.xml', (req, res) => sendSitemapPart(req, res, 'masters'));

app.get('/blog/feed.xml', async (_req, res) => {
  try {
    const { buildBlogRssFeed } = require('./seo/syndicationFeed');
    const xml = await buildBlogRssFeed(require('./config/database'));
    res.type('application/rss+xml').send(xml);
  } catch (err) {
    console.error('blog feed:', err);
    res.status(500).type('text/plain').send('Feed error');
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Диагностика старта booking в TG/MAX WebView (этапы BOOKING_HTML_LOADED, MAIN_JS_STARTED, …)
app.post('/api/debug-log', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const stage = String(body.stage || '').slice(0, 64);
  if (!stage) return res.status(400).json({ error: 'stage required' });
  const line = {
    stage,
    t: body.t || Date.now(),
    path: body.path,
    search: body.search ? String(body.search).slice(0, 120) : undefined,
    ua: body.ua ? String(body.ua).slice(0, 80) : undefined,
    ip: req.ip,
    ...(body.masterId ? { masterId: String(body.masterId).slice(0, 64) } : {}),
    ...(body.status != null ? { status: body.status } : {}),
    ...(body.count != null ? { count: body.count } : {}),
    ...(body.mode ? { mode: body.mode } : {}),
  };
  console.log('[client-boot]', JSON.stringify(line));
  res.json({ ok: true });
});

// Публичные настройки для фронтенда (ключ карт — ограничьте по HTTP Referer в кабинете Яндекса)
app.get('/api/app-assets', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  try {
    res.json(readAppAssets());
  } catch (err) {
    res.status(500).json({ error: 'app_assets_unavailable' });
  }
});

app.get('/api/config/public', (req, res) => {
  const billingEnabled = (process.env.BILLING_ENABLED || '').trim().toLowerCase();
  res.json({
    yandexMapsApiKey: (process.env.YANDEX_MAPS_API_KEY || '').trim(),
    yandexMapsConfigured: Boolean((process.env.YANDEX_MAPS_API_KEY || '').trim()),
    billingEnabled: billingEnabled === 'true' || billingEnabled === '1' || billingEnabled === 'yes'
  });
});

// Короткая ссылка из бота → промежуточная страница → браузер с ?a=код
app.get('/o/:code', async (req, res) => {
  try {
    const { getClientOpenLink, buildOpenBootstrapHtml } = require('./utils/clientOpenLink');

    const row = await getClientOpenLink(req.params.code);
    if (!row) {
      return res.status(404).type('html').send(
        '<!DOCTYPE html><html lang="ru"><body style="font-family:system-ui;padding:24px;text-align:center">'
        + '<p>Ссылка устарела.</p><p>Откройте запись через бота ещё раз.</p></body></html>'
      );
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.type('html').send(buildOpenBootstrapHtml({
      slug: row.public_slug,
      code: req.params.code,
      channel: row.channel,
    }));
  } catch (err) {
    console.error('Client open link:', err.message);
    res.status(500).type('html').send('<!DOCTYPE html><html><body><p>Ошибка сервера</p></body></html>');
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve frontend for all other routes (SPA)
app.get('*', (req, res) => {
  if (req.path.startsWith('/assets/') || req.path.startsWith('/src/')) {
    return res.status(404).type('text/plain').send('Not found');
  }
  if (/\.(js|jsx|mjs|css|map|wasm)$/i.test(req.path)) {
    return res.status(404).type('text/plain').send('Not found');
  }
  sendSpaIndexWithSeo(res, path.join(frontendDist, 'index.html'), req.path);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});

// Start server
function assertFrontendDist() {
  const indexHtml = path.join(frontendDist, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.error(
      `[frontend] Нет сборки: ${indexHtml}\n` +
      '  cd frontend && npm run build\n' +
      '  или: /opt/aicrmpro/deploy/sync-live.sh'
    );
    process.exit(1);
  }
  const assetsDir = path.join(frontendDist, 'assets');
  if (fs.existsSync(assetsDir)) {
    const bundles = fs.readdirSync(assetsDir).filter((f) => /^index-.*\.(js|css)$/.test(f));
    if (bundles.length) {
      console.log(`[frontend] ${frontendDist} → ${bundles.join(', ')}`);
    }
  }
}

assertFrontendDist();

app.listen(PORT, async () => {
  await cleanupPastScheduleExceptionsOnStartup();
  await initSeo();
  console.log(`Сервер запущен на порту ${PORT}`);
});

module.exports = app;
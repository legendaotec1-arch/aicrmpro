/**
 * Оркестратор автосабмита — выбирает адаптер по platform/link_key,
 * запускает submit, обновляет статус в БД.
 */
const BaseSubmitAdapter = require('./adapters/base');
const RedditAdapter = require('./adapters/reddit');
const TelegramAdapter = require('./adapters/telegram');
const VkAdapter = require('./adapters/vk');
const PressFeedAdapter = require('./adapters/pressfeed');
const ProductHuntAdapter = require('./adapters/producthunt');
const GitHubAdapter = require('./adapters/github');
const BookmarkAdapter = require('./adapters/bookmark');
const SocialAdapter = require('./adapters/social');
const HackerNewsAdapter = require('./adapters/hackernews');
const { SITE_URL, CONTACT_EMAIL } = require('../config');
const db = require('../../config/database');

function pickAdapter(link) {
  const key = link.link_key || '';
  if (key.startsWith('reddit')) return new RedditAdapter();
  if (key.startsWith('telegram') || key.includes('telegram-channel')) return new TelegramAdapter();
  if (key.startsWith('vk')) return new VkAdapter();
  if (key.startsWith('press-feed')) return new PressFeedAdapter();
  if (key.startsWith('producthunt')) return new ProductHuntAdapter();
  if (key.startsWith('github')) return new GitHubAdapter();
  if (key.startsWith('hackernews')) return new HackerNewsAdapter();
  if (link.platform === 'bookmark') return new BookmarkAdapter();
  if (link.platform === 'social') return new SocialAdapter();
  return new BaseSubmitAdapter(); // Noop
}

function buildCtx(link) {
  const utmParams = new URLSearchParams();
  if (link.utm_source) utmParams.set('utm_source', link.utm_source);
  if (link.utm_medium) utmParams.set('utm_medium', link.utm_medium);
  if (link.utm_campaign) utmParams.set('utm_campaign', link.utm_campaign);
  const qs = utmParams.toString();
  const target = link.target_path || '/';
  const trackedUrl = `${SITE_URL}${target.startsWith('/') ? target : '/' + target}${qs ? '?' + qs : ''}`;
  return {
    trackedUrl,
    siteName: 'Woner.ru',
    contactEmail: process.env.PRESS_CONTACT_EMAIL || CONTACT_EMAIL || 'team@woner.ru',
  };
}

/**
 * Запустить автосабмит для одной ссылки.
 * Возвращает { ok, status, message, externalUrl } и обновляет link в БД.
 */
async function submitLink(link) {
  const adapter = pickAdapter(link);
  if (adapter.constructor === BaseSubmitAdapter) {
    return { ok: false, error: 'no adapter for this platform' };
  }
  const ctx = buildCtx(link);
  let result;
  try {
    result = await adapter.submit(link, ctx);
  } catch (err) {
    result = { ok: false, error: err.message };
  }

  // Обновляем в БД
  const newStatus = result.ok
    ? 'live'
    : result.requiresManualReview
      ? 'in_progress'
      : 'planned';
  await db.query(
    `UPDATE seo_external_links SET
       status = $2,
       last_attempt_at = NOW(),
       last_attempt_status = $3,
       last_attempt_message = $4,
       live_post_url = COALESCE($5, live_post_url),
       live_at = CASE WHEN $2 = 'live' AND live_at IS NULL THEN NOW() ELSE live_at END,
       submitted_at = COALESCE(submitted_at, NOW()),
       updated_at = NOW()
     WHERE id = $1`,
    [
      link.id,
      newStatus,
      result.ok ? 'success' : (result.requiresManualReview ? 'review_needed' : 'failed'),
      result.message || result.error || '',
      result.externalUrl || null,
    ]
  );
  return { ...result, newStatus };
}

/**
 * Dry-run — показать, что будет отправлено, без реального сабмита.
 */
async function previewLink(link) {
  const adapter = pickAdapter(link);
  const ctx = buildCtx(link);
  return adapter.preview(link, ctx);
}

/**
 * Запустить автосабмит для всех ссылок со статусом planned и auto_submit != manual.
 */
async function runAutoSubmitBatch({ limit = 5, platforms = null, dryRun = false } = {}) {
  const conditions = [
    "status = 'planned'",
    "auto_submit IN ('api', 'webhook')",
    "(requires_review = FALSE OR last_attempt_at IS NULL)",
  ];
  if (platforms && platforms.length) {
    conditions.push(`platform IN (${platforms.map((_, i) => '$' + (i + 1)).join(',')})`);
  }
  const sql = `SELECT * FROM seo_external_links
               WHERE ${conditions.join(' AND ')}
               ORDER BY priority DESC, domain_rating DESC NULLS LAST
               LIMIT $${(platforms?.length || 0) + 1}`;
  const params = [...(platforms || []), limit];
  const res = await db.query(sql, params);
  const results = [];
  for (const link of res.rows) {
    if (dryRun) {
      const preview = await previewLink(link);
      results.push({ link_key: link.link_key, platform: link.platform, preview });
      continue;
    }
    const r = await submitLink(link);
    results.push({ link_key: link.link_key, platform: link.platform, ...r });
    // Пауза между сабмитами, чтобы не упереться в rate-limit
    await new Promise((res) => setTimeout(res, 2000));
  }
  return { total: results.length, results };
}

module.exports = {
  submitLink,
  previewLink,
  runAutoSubmitBatch,
  pickAdapter,
  buildCtx,
};
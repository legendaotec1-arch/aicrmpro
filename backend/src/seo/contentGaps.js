const { SITE_URL } = require('./config');

function stripHtml(text) {
  return String(text || '').replace(/<[^>]+>/g, '').trim();
}

function pathFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `${SITE_URL}${url}`);
    return u.pathname.replace(/^\//, '').replace(/\/$/, '') || null;
  } catch {
    return String(url).replace(/^\//, '').split('?')[0] || null;
  }
}

async function loadPageImpressionMap(db) {
  const map = new Map();
  try {
    const res = await db.query(`
      SELECT
        regexp_replace(page_url, '^https?://[^/]+/', '') AS path,
        SUM(impressions)::int AS impressions,
        SUM(clicks)::int AS clicks,
        AVG(position) FILTER (WHERE position > 0 AND position < 100) AS avg_position
      FROM seo_query_stats
      WHERE page_url IS NOT NULL AND page_url <> ''
      GROUP BY path
    `);
    res.rows.forEach((row) => {
      const path = String(row.path || '').replace(/\/$/, '');
      const slug = path.startsWith('blog/') ? path : path.split('/')[0];
      const prev = map.get(slug) || { impressions: 0, clicks: 0, positions: [] };
      prev.impressions += Number(row.impressions || 0);
      prev.clicks += Number(row.clicks || 0);
      if (row.avg_position != null) prev.avgPosition = Number(row.avg_position);
      map.set(slug, prev);
    });
  } catch {
    /* no metrics yet */
  }
  return map;
}

function analyzePageContent(page) {
  const intro = stripHtml(page.intro);
  const sections = typeof page.sections === 'string' ? JSON.parse(page.sections) : (page.sections || []);
  const faq = typeof page.faq === 'string' ? JSON.parse(page.faq) : (page.faq || []);
  const meta = String(page.meta_description || '');

  return {
    introLen: intro.length,
    sectionCount: sections.length,
    faqCount: faq.length,
    metaLen: meta.length,
    thinIntro: intro.length < 120,
    thinMeta: meta.length < 80,
    noFaq: faq.length < 2,
    fewSections: sections.length < 2,
  };
}

function buildRecommendations(page, stats, content, hasSearchData) {
  const recs = [];
  const impressions = stats?.impressions || 0;
  const clicks = stats?.clicks || 0;
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const slug = page.slug;

  if (hasSearchData && impressions === 0) {
    recs.push({
      issue_type: 'zero_impressions',
      severity: 'warning',
      recommendation:
        `Страница /${slug} не получает показов в поиске. Добавьте ключ «${page.h1}» в title и H1, расширьте intro до 300+ символов и поставьте 3–5 внутренних ссылок с хабов /resheniya и /otrasli.`,
      actions: ['update_title', 'expand_intro', 'add_internal_links', 'submit_sitemap'],
    });
  }

  if (!hasSearchData && impressions === 0) {
    recs.push({
      issue_type: 'zero_impressions',
      severity: 'info',
      recommendation:
        `Нет данных Вебмастера по /${slug}. После синхронизации метрик проверьте показы. Пока: усильте intro, FAQ и перелинковку.`,
      actions: ['sync_metrics', 'expand_intro', 'add_faq'],
    });
  }

  if (content.thinIntro) {
    recs.push({
      issue_type: 'thin_intro',
      severity: impressions === 0 ? 'warning' : 'info',
      recommendation:
        `Intro на /${slug} короткий (${content.introLen} симв.). Добавьте боль контекста: боль ниши, выгода, призыв к регистрации — цель 300–500 символов.`,
      actions: ['expand_intro'],
    });
  }

  if (content.thinMeta) {
    recs.push({
      issue_type: 'short_meta',
      severity: 'warning',
      recommendation:
        `Meta description /${slug} — ${content.metaLen} симв. (нужно 120–160). Включите ключевой запрос и УТП: Telegram, бесплатный старт, тариф за запись.`,
      actions: ['expand_meta'],
    });
  }

  if (content.noFaq) {
    recs.push({
      issue_type: 'missing_faq',
      severity: 'info',
      recommendation:
        `Добавьте 4–6 FAQ на /${slug} с long-tail запросами («сколько стоит», «как подключить Telegram», «чем отличается от YCLIENTS»).`,
      actions: ['add_faq'],
    });
  }

  if (content.fewSections) {
    recs.push({
      issue_type: 'thin_content',
      severity: 'info',
      recommendation:
        `Мало секций на /${slug}. Добавьте блоки: «Как работает», «Для кого», «Тарифы», «С чего начать».`,
      actions: ['add_sections'],
    });
  }

  if (impressions >= 50 && ctr < 0.015 && stats?.avgPosition != null && stats.avgPosition <= 15) {
    recs.push({
      issue_type: 'low_ctr',
      severity: 'warning',
      recommendation:
        `Низкий CTR (${(ctr * 100).toFixed(2)}%) при ${impressions} показах и позиции ~${stats.avgPosition.toFixed(1)}. Перепишите title и description — добавьте цифры, «бесплатно», «Telegram».`,
      actions: ['rewrite_title', 'rewrite_meta'],
    });
  }

  if (impressions >= 20 && clicks === 0 && stats?.avgPosition != null && stats.avgPosition > 20) {
    recs.push({
      issue_type: 'poor_position',
      severity: 'warning',
      recommendation:
        `Позиция ~${stats.avgPosition.toFixed(1)} при ${impressions} показах без кликов. Нужны: расширение контента, FAQ, внешние ссылки, перелинковка с авторитетных хабов.`,
      actions: ['expand_content', 'add_internal_links', 'external_links'],
    });
  }

  return recs;
}

/** Анализ страниц без показов и рекомендации */
async function analyzeContentGaps(db) {
  const impressionMap = await loadPageImpressionMap(db);
  const hasSearchData = impressionMap.size > 0;

  const pagesRes = await db.query(`
    SELECT slug, page_type, cluster, niche, title, h1, meta_description, intro, sections, faq, priority
    FROM seo_pages WHERE published = TRUE
    ORDER BY priority DESC
  `);

  const gaps = [];
  let zeroImpressions = 0;

  for (const page of pagesRes.rows) {
    const stats = impressionMap.get(page.slug) || { impressions: 0, clicks: 0 };
    const content = analyzePageContent(page);
    const recs = buildRecommendations(page, stats, content, hasSearchData);

    if (stats.impressions === 0) zeroImpressions += 1;

    for (const rec of recs) {
      gaps.push({
        slug: page.slug,
        path: `/${page.slug}`,
        page_type: page.page_type,
        impressions: stats.impressions,
        clicks: stats.clicks,
        avg_position: stats.avgPosition ?? null,
        ...rec,
      });
    }
  }

  gaps.sort((a, b) => {
    const sev = { error: 0, warning: 1, info: 2 };
    const d = (sev[a.severity] || 3) - (sev[b.severity] || 3);
    if (d !== 0) return d;
    return a.impressions - b.impressions;
  });

  return {
    hasSearchData,
    totalPages: pagesRes.rows.length,
    zeroImpressions,
    gaps,
  };
}

module.exports = {
  analyzeContentGaps,
  loadPageImpressionMap,
  buildRecommendations,
  analyzePageContent,
};

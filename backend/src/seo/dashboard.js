const repo = require('./repository');
const { getLatestAudit } = require('./audit');
const { loadSearchMetrics } = require('./searchMetrics');
const { getExternalLinkStats } = require('./externalLinks');
const { loadIntelligenceDashboard } = require('./seoIntelligence');
const { STATIC_ROUTES, NOINDEX_PREFIXES, NOINDEX_EXACT, SITE_URL } = require('./config');

async function collectIndexStats(db) {
  const [
    seoPagesRes,
    articlesLive,
    articlesScheduled,
    articlesDraftRes,
    mastersIndexableRes,
    mastersHiddenRes,
    mastersNoSlugRes,
    mastersTotalRes,
  ] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS c FROM seo_pages WHERE published = TRUE`),
    repo.countLiveArticles(),
    repo.countScheduledArticles(),
    db.query(`SELECT COUNT(*)::int AS c FROM seo_articles WHERE published = FALSE`),
    db.query(
      `SELECT COUNT(*)::int AS c FROM masters
       WHERE public_indexable IS NOT FALSE AND public_slug IS NOT NULL`
    ).catch(() => ({ rows: [{ c: 0 }] })),
    db.query(
      `SELECT COUNT(*)::int AS c FROM masters WHERE public_indexable = FALSE`
    ).catch(() => ({ rows: [{ c: 0 }] })),
    db.query(
      `SELECT COUNT(*)::int AS c FROM masters WHERE public_slug IS NULL`
    ).catch(() => ({ rows: [{ c: 0 }] })),
    db.query(`SELECT COUNT(*)::int AS c FROM masters`).catch(() => ({ rows: [{ c: 0 }] })),
  ]);

  const seoPages = seoPagesRes.rows[0]?.c || 0;
  const mastersIndexable = mastersIndexableRes.rows[0]?.c || 0;
  const mastersHidden = mastersHiddenRes.rows[0]?.c || 0;
  const mastersNoSlug = mastersNoSlugRes.rows[0]?.c || 0;
  const mastersTotal = mastersTotalRes.rows[0]?.c || 0;
  const articlesDraft = articlesDraftRes.rows[0]?.c || 0;
  const staticPages = STATIC_ROUTES.length;

  const indexable = {
    seoPages,
    articles: articlesLive,
    masters: mastersIndexable,
    static: staticPages,
    total: seoPages + articlesLive + mastersIndexable + staticPages,
  };

  const nonIndexable = {
    scheduledArticles: articlesScheduled,
    draftArticles: articlesDraft,
    mastersHidden,
    mastersNoSlug,
    mastersPending: Math.max(0, mastersTotal - mastersIndexable - mastersHidden),
    systemPaths: NOINDEX_PREFIXES.length + NOINDEX_EXACT.size,
    total: articlesScheduled + articlesDraft + mastersHidden + mastersNoSlug,
  };

  const sitemapEstimate = indexable.total;

  return { indexable, nonIndexable, sitemapEstimate, mastersTotal };
}

function groupIssues(issues = []) {
  const byType = {};
  issues.forEach((issue) => {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
  });
  return byType;
}

function formatIssue(issue) {
  switch (issue.type) {
    case 'missing_h1':
      return { severity: issue.severity, message: `Нет H1: /${issue.slug}` };
    case 'missing_title':
      return { severity: issue.severity, message: `Нет title: /${issue.slug}` };
    case 'missing_description':
      return { severity: issue.severity, message: `Нет description: /${issue.slug}` };
    case 'short_description':
      return { severity: issue.severity, message: `Короткий description: /${issue.slug}` };
    case 'duplicate_title':
      return { severity: issue.severity, message: `Дубль title «${issue.title}»: ${issue.slugs?.join(', ')}` };
    case 'duplicate_description':
      return { severity: issue.severity, message: `Дубль description: ${issue.slugs?.join(', ')}` };
    case 'broken_internal_link':
      return { severity: issue.severity, message: `Битая ссылка ${issue.from} → ${issue.to}` };
    case 'master_no_slug':
      return { severity: issue.severity, message: `Мастер без slug: ${issue.masterId}` };
    case 'master_hidden':
      return { severity: issue.severity, message: `Страница мастера скрыта: /m/${issue.slug}` };
    case 'thin_master_page':
      return { severity: issue.severity, message: `Тонкая страница мастера: /m/${issue.slug}` };
    default:
      return { severity: issue.severity || 'info', message: JSON.stringify(issue) };
  }
}

async function buildSeoDashboard(db) {
  const [index, search, auditRow, externalLinks, intelligence] = await Promise.all([
    collectIndexStats(db),
    loadSearchMetrics(db),
    getLatestAudit(db),
    getExternalLinkStats(db).catch(() => null),
    loadIntelligenceDashboard(db).catch(() => null),
  ]);

  const audit = auditRow
    ? {
        runAt: auditRow.run_at,
        summary: typeof auditRow.summary === 'string'
          ? JSON.parse(auditRow.summary)
          : auditRow.summary,
        issues: (typeof auditRow.issues === 'string'
          ? JSON.parse(auditRow.issues)
          : auditRow.issues) || [],
      }
    : null;

  const issues = audit?.issues || [];
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return {
    siteUrl: SITE_URL,
    generatedAt: new Date().toISOString(),
    search: {
      ...search,
      totals: {
        impressions: search.totals.impressions,
        clicks: search.totals.clicks,
        ctr: search.totals.ctr,
        avgPosition: search.totals.avgPosition,
      },
    },
    index,
    audit: audit
      ? {
          runAt: audit.runAt,
          pagesChecked: audit.summary?.pagesChecked || 0,
          errors: audit.summary?.errors ?? errors.length,
          warnings: audit.summary?.warnings ?? warnings.length,
          issueTypes: groupIssues(issues),
          issues: issues.slice(0, 100).map(formatIssue),
        }
      : {
          runAt: null,
          pagesChecked: 0,
          errors: 0,
          warnings: 0,
          issueTypes: {},
          issues: [],
        },
    content: {
      seoPages: index.indexable.seoPages,
      articlesLive: index.indexable.articles,
      articlesScheduled: index.nonIndexable.scheduledArticles,
      mastersIndexable: index.indexable.masters,
    },
    externalLinks: externalLinks || { total: 0, live: 0, target: 30, progressPct: 0 },
    intelligence: intelligence
      ? {
          analyzedAt: intelligence.analyzedAt,
          clusters: intelligence.stats?.cluster_count || intelligence.clusters?.length || 0,
          gapClusters: intelligence.stats?.gap_clusters || 0,
          recommendations: intelligence.stats?.gap_recommendations || intelligence.gaps?.length || 0,
          zeroImpressions: intelligence.stats?.zero_impressions || 0,
          topGaps: (intelligence.gaps || []).slice(0, 10),
          topClusters: (intelligence.clusters || []).slice(0, 10),
        }
      : null,
  };
}

module.exports = { buildSeoDashboard, collectIndexStats };

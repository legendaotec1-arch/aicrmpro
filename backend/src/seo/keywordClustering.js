const { NICHE_CATALOG } = require('./niches');
const { slugify } = require('../utils/slugify');
const { SITE_URL } = require('./config');

const STOP_WORDS = new Set([
  'и', 'в', 'во', 'на', 'для', 'с', 'со', 'по', 'к', 'ко', 'от', 'из', 'у', 'о', 'об', 'а', 'но',
  'как', 'что', 'это', 'или', 'не', 'ни', 'же', 'ли', 'бы', 'до', 'при', 'без', 'над', 'под',
  'the', 'a', 'an', 'for', 'to', 'of', 'in', 'on', 'and', 'or', 'ru', 'woner',
]);

const INTENTS = [
  {
    id: 'crm',
    cluster: 'crm',
    patterns: [/crm/i, /управлени[ея].*клиент/i, /баз[аы].*клиент/i, /клиентск/i, /программ.*клиент/i],
    label: 'CRM',
  },
  {
    id: 'booking',
    cluster: 'booking',
    patterns: [/онлайн.?запис/i, /онлайн.?запись/i, /запись клиент/i, /записи клиент/i, /календар/i, /расписан/i, /сервис.*запис/i, /систем.*запис/i],
    label: 'Онлайн-запись',
  },
  {
    id: 'compare',
    cluster: 'crm',
    patterns: [/yclients/i, /yclient/i, /dikidi/i, /altegio/i, /altelgio/i, /замен/i, /альтернатив/i, /лучш.*crm/i, /сравнен/i],
    label: 'Сравнение',
  },
  {
    id: 'telegram',
    cluster: 'booking',
    patterns: [/telegram/i, /телеграм/i, /\bбот\b/i, /\bmax\b/i, /мессенджер/i],
    label: 'Telegram / MAX',
  },
  {
    id: 'beauty',
    cluster: 'beauty',
    patterns: [/салон/i, /маникюр/i, /педикюр/i, /барбер/i, /парикмахер/i, /косметолог/i, /бьюти/i, /мастер/i],
    label: 'Бьюти',
  },
  {
    id: 'automation',
    cluster: 'crm',
    patterns: [/автоматиз/i, /напоминан/i, /рассылк/i, /уведомлен/i],
    label: 'Автоматизация',
  },
];

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function detectIntent(query) {
  const q = String(query || '').toLowerCase();
  for (const intent of INTENTS) {
    if (intent.patterns.some((re) => re.test(q))) return intent;
  }
  return { id: 'general', cluster: 'crm', label: 'Общий', patterns: [] };
}

function detectNiche(query) {
  const q = String(query || '').toLowerCase();
  for (const niche of NICHE_CATALOG) {
    const tokens = [
      niche.id,
      niche.slugBase.replace(/-/g, ' '),
      niche.genitive,
      ...(niche.bookingNa ? [niche.bookingNa.label] : []),
      ...(niche.bookingV ? [niche.bookingV.label] : []),
    ];
    for (const t of tokens) {
      const norm = String(t).toLowerCase();
      if (norm.length > 3 && q.includes(norm.replace(/\s+/g, ' ').slice(0, 12))) {
        return niche;
      }
    }
    if (q.includes(niche.slugBase.replace(/-/g, ' '))) return niche;
    const genWords = niche.genitive.split(' ').filter((w) => w.length > 4);
    if (genWords.some((w) => q.includes(w))) return niche;
  }
  return null;
}

function pathFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : `${SITE_URL}${url}`);
    return u.pathname.replace(/^\//, '').replace(/\/$/, '');
  } catch {
    return String(url).replace(/^\//, '').split('?')[0];
  }
}

function slugFromPath(path) {
  if (!path) return null;
  if (path.startsWith('blog/')) return path;
  return path.split('/')[0];
}

function findBestPageSlug(query, pageSlugs) {
  const tokens = tokenize(query);
  if (!tokens.length) return null;

  let best = null;
  let bestScore = 0;
  for (const slug of pageSlugs) {
    const slugTokens = slug.replace(/-/g, ' ').split(/\s+/);
    let score = 0;
    for (const t of tokens) {
      if (slug.includes(t) || slugTokens.some((st) => st.startsWith(t.slice(0, 4)))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = slug;
    }
  }
  return bestScore >= 2 ? best : null;
}

function clusterKey(intentId, nicheId, primaryToken) {
  return [intentId, nicheId || 'general', primaryToken || 'core'].join(':');
}

function buildClusterLabel(intent, niche, keywords) {
  const top = keywords[0]?.query || '';
  if (niche) {
    if (intent.id === 'booking') return `Онлайн-запись для ${niche.genitive}`;
    if (intent.id === 'crm') return `CRM для ${niche.genitive}`;
    if (intent.id === 'compare') return `Альтернативы и сравнения — ${niche.genitive}`;
    if (intent.id === 'telegram') return `Запись через Telegram для ${niche.genitive}`;
    return `${intent.label} — ${niche.genitive}`;
  }
  return top.slice(0, 80) || intent.label;
}

/** Собирает ключевые слова из БД: поисковые запросы + страницы + статьи */
async function loadKeywordCorpus(db) {
  const corpus = [];

  try {
    const queriesRes = await db.query(`
      SELECT query, source,
             SUM(impressions)::int AS impressions,
             SUM(clicks)::int AS clicks,
             AVG(position) FILTER (WHERE position > 0) AS avg_position,
             MAX(page_url) AS page_url
      FROM seo_query_stats
      WHERE query IS NOT NULL AND query <> ''
      GROUP BY query, source
      ORDER BY SUM(impressions) DESC
      LIMIT 1000
    `);
    queriesRes.rows.forEach((row) => {
      corpus.push({
        query: row.query,
        source: row.source,
        impressions: Number(row.impressions || 0),
        clicks: Number(row.clicks || 0),
        position: row.avg_position != null ? Number(row.avg_position) : null,
        pagePath: pathFromUrl(row.page_url),
        origin: 'search',
      });
    });
  } catch {
    /* table may not exist */
  }

  try {
    const pagesRes = await db.query(
      `SELECT slug, h1, title, cluster, niche FROM seo_pages WHERE published = TRUE`
    );
    pagesRes.rows.forEach((row) => {
      corpus.push({
        query: row.h1,
        source: 'onsite',
        impressions: 0,
        clicks: 0,
        position: null,
        pagePath: row.slug,
        origin: 'page',
        cluster: row.cluster,
        niche: row.niche,
      });
    });
  } catch {
    /* ignore */
  }

  try {
    const artsRes = await db.query(
      `SELECT slug, h1, title, category FROM seo_articles WHERE published = TRUE`
    );
    artsRes.rows.forEach((row) => {
      corpus.push({
        query: row.h1,
        source: 'onsite',
        impressions: 0,
        clicks: 0,
        position: null,
        pagePath: `blog/${row.slug}`,
        origin: 'article',
        category: row.category,
      });
    });
  } catch {
    /* ignore */
  }

  return corpus;
}

async function loadPageSlugSet(db) {
  const slugs = new Set();
  try {
    const res = await db.query(`SELECT slug FROM seo_pages WHERE published = TRUE`);
    res.rows.forEach((r) => slugs.add(r.slug));
  } catch {
    /* ignore */
  }
  return slugs;
}

/** Кластеризация ключевых слов */
async function clusterKeywords(db) {
  const corpus = await loadKeywordCorpus(db);
  const pageSlugs = await loadPageSlugSet(db);
  const buckets = new Map();

  for (const item of corpus) {
    const intent = item.origin === 'page' && item.cluster
      ? INTENTS.find((i) => i.cluster === item.cluster) || detectIntent(item.query)
      : detectIntent(item.query);
    const niche = item.niche
      ? NICHE_CATALOG.find((n) => n.id === item.niche) || detectNiche(item.query)
      : detectNiche(item.query);

    const tokens = tokenize(item.query);
    const primary = tokens.find((t) => t.length > 4) || tokens[0] || 'core';
    const key = clusterKey(intent.id, niche?.id, primary);

    if (!buckets.has(key)) {
      buckets.set(key, {
        clusterKey: key,
        label: '',
        intent: intent.id,
        seoCluster: intent.cluster,
        niche: niche?.id || null,
        nicheData: niche,
        keywords: [],
        totalImpressions: 0,
        totalClicks: 0,
        positionSum: 0,
        positionWeight: 0,
      });
    }

    const bucket = buckets.get(key);
    bucket.keywords.push({
      query: item.query,
      source: item.source,
      impressions: item.impressions,
      clicks: item.clicks,
      position: item.position,
      origin: item.origin,
      pagePath: item.pagePath,
    });
    bucket.totalImpressions += item.impressions;
    bucket.totalClicks += item.clicks;
    if (item.position != null && item.impressions > 0) {
      bucket.positionSum += item.position * item.impressions;
      bucket.positionWeight += item.impressions;
    }
  }

  const clusters = [];
  for (const bucket of buckets.values()) {
    bucket.keywords.sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks);
    bucket.label = buildClusterLabel(
      INTENTS.find((i) => i.id === bucket.intent) || INTENTS[0],
      bucket.nicheData,
      bucket.keywords
    );
    bucket.keywordCount = bucket.keywords.length;
    bucket.avgPosition = bucket.positionWeight > 0
      ? bucket.positionSum / bucket.positionWeight
      : null;

    let mappedSlug = null;
    for (const kw of bucket.keywords) {
      if (kw.pagePath && !kw.pagePath.startsWith('blog/')) {
        const s = slugFromPath(kw.pagePath);
        if (pageSlugs.has(s)) {
          mappedSlug = s;
          break;
        }
      }
    }
    if (!mappedSlug) {
      const topQuery = bucket.keywords.find((k) => k.origin === 'search')?.query
        || bucket.keywords[0]?.query;
      mappedSlug = findBestPageSlug(topQuery, pageSlugs);
    }
    if (!mappedSlug && bucket.nicheData) {
      const n = bucket.nicheData;
      const candidates = [
        `crm-dlya-${n.slugBase}`,
        `online-zapis-dlya-${n.slugBase}`,
        `baza-klientov-dlya-${n.slugBase}`,
      ];
      mappedSlug = candidates.find((c) => pageSlugs.has(c)) || null;
    }

    bucket.mappedSlug = mappedSlug;
    bucket.status = mappedSlug ? 'mapped' : (bucket.totalImpressions > 0 ? 'gap' : 'unmapped');
    delete bucket.nicheData;
    delete bucket.positionSum;
    delete bucket.positionWeight;
    delete bucket.seoCluster;
    clusters.push(bucket);
  }

  clusters.sort((a, b) => b.totalImpressions - a.totalImpressions || b.keywordCount - a.keywordCount);
  return clusters;
}

function suggestSlugForCluster(cluster) {
  const niche = cluster.niche ? NICHE_CATALOG.find((n) => n.id === cluster.niche) : null;
  const topQuery = cluster.keywords?.find((k) => k.origin === 'search')?.query
    || cluster.keywords?.[0]?.query
    || cluster.label;

  if (niche) {
    if (cluster.intent === 'booking') return `online-zapis-dlya-${niche.slugBase}`;
    if (cluster.intent === 'crm') return `crm-dlya-${niche.slugBase}`;
    if (cluster.intent === 'telegram') return `onlajn-zapis-telegram-dlya-${niche.slugBase}`;
    if (cluster.intent === 'compare') {
      const q = topQuery.toLowerCase();
      if (q.includes('dikidi')) return `alternativa-dikidi`;
      if (q.includes('yclients')) return `alternativa-yclients`;
      if (q.includes('altegio')) return `alternativa-altegio`;
      return `crm-dlya-${niche.slugBase}`;
    }
    if (cluster.intent === 'automation') return `avtomatizaciya-zapisi-dlya-${niche.slugBase}`;
    return `crm-dlya-${niche.slugBase}`;
  }

  const fromQuery = slugify(topQuery);
  return fromQuery || slugify(cluster.label);
}

module.exports = {
  clusterKeywords,
  loadKeywordCorpus,
  findBestPageSlug,
  suggestSlugForCluster,
  detectIntent,
  detectNiche,
  INTENTS,
};

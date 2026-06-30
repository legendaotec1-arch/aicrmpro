const { buildArticle } = require('./templates');
const { NICHE_CATALOG } = require('./niches');
const {
  NICHE_ARTICLE_TEMPLATES,
  COMPARE_ARTICLE_COMPETITORS,
  GLOBAL_ARTICLE_TEMPLATES,
} = require('./articleTemplates');

const TOP_COMPARE_NICHES = NICHE_CATALOG.slice(0, 15);

function relatedForNiche(n) {
  return [
    `crm-dlya-${n.slugBase}`,
    `online-zapis-dlya-${n.slugBase}`,
    'crm-dlya-klientov',
    'online-zapis-dlya-klientov',
    'blog',
  ].filter(Boolean);
}

function relatedForGlobal(tpl) {
  const links = ['blog', 'crm-dlya-klientov', 'online-zapis-dlya-klientov'];
  if (tpl.competitor === 'DIKIDI') links.push('alternativa-dikidi', 'chem-zamenit-dikidi');
  if (tpl.competitor === 'YCLIENTS') links.push('alternativa-yclients', 'chem-zamenit-yclients');
  if (tpl.competitor === 'Altegio') links.push('alternativa-altegio', 'chem-zamenit-altegio');
  if (tpl.category === 'crm') links.push('luchshie-crm-dlya-salona-krasoty');
  return [...new Set(links)];
}

function generateNicheArticles() {
  const articles = [];
  const seen = new Set();

  for (const n of NICHE_CATALOG) {
    for (const tpl of NICHE_ARTICLE_TEMPLATES) {
      const slug = tpl.slug(n);
      if (seen.has(slug)) continue;
      seen.add(slug);

      const built = buildArticle({
        slug,
        category: tpl.category,
        h1: tpl.h1(n),
        title: tpl.title(n),
        nicheLabel: n.genitive,
        articleType: tpl.articleType,
        categoryTag: n.category,
        competitor: tpl.competitor,
      });

      const related = [...relatedForNiche(n)];
      if (tpl.competitor === 'DIKIDI') related.push('chem-zamenit-dikidi', 'alternativa-dikidi');
      if (tpl.competitor === 'YCLIENTS') related.push('chem-zamenit-yclients', 'alternativa-yclients');
      if (tpl.competitor === 'Altegio') related.push('chem-zamenit-altegio', 'alternativa-altegio');

      articles.push({
        ...built,
        related_slugs: [...new Set(related)].filter((s) => s !== slug).slice(0, 8),
        published: true,
      });
    }
  }

  for (const n of TOP_COMPARE_NICHES) {
    for (const cmp of COMPARE_ARTICLE_COMPETITORS) {
      const slug = `alternativa-${cmp.competitor}-dlya-${n.slugBase}`;
      if (seen.has(slug)) continue;
      seen.add(slug);

      const title = `Альтернатива ${cmp.label} для ${n.genitive} — Woner.ru`;
      const h1 = `Альтернатива ${cmp.label} для ${n.genitive}`;
      const built = buildArticle({
        slug,
        category: 'compare',
        h1,
        title,
        nicheLabel: n.genitive,
        articleType: 'compare',
        categoryTag: n.category,
        competitor: cmp.label,
      });

      articles.push({
        ...built,
        related_slugs: [
          ...relatedForNiche(n),
          `alternativa-${cmp.competitor}`,
          `chem-zamenit-${cmp.competitor}-dlya-${n.slugBase}`,
        ].filter((s, i, arr) => arr.indexOf(s) === i && s !== slug).slice(0, 8),
        published: true,
      });
    }
  }

  for (const tpl of GLOBAL_ARTICLE_TEMPLATES) {
    if (seen.has(tpl.slug)) continue;
    seen.add(tpl.slug);

    const built = buildArticle({
      slug: tpl.slug,
      category: tpl.category,
      h1: tpl.h1,
      title: tpl.title,
      nicheLabel: tpl.nicheLabel || 'мастеров и салонов',
      articleType: tpl.articleType,
      categoryTag: 'beauty',
      competitor: tpl.competitor,
    });

    articles.push({
      ...built,
      related_slugs: relatedForGlobal(tpl).filter((s) => s !== tpl.slug).slice(0, 8),
      published: true,
    });
  }

  return articles;
}

function parseGeoSlug(slug) {
  // online-zapis-{nicheBase}-{citySlug}
  const m = /^online-zapis-([a-z0-9-]+)-([a-z0-9-]+)$/i.exec(slug);
  if (!m) return null;
  return { nicheBase: m[1], citySlug: m[2] };
}

function assignSmartRelatedLinks(pages) {
  const byNiche = {};
  const byCluster = {};
  const byCity = {};
  const geoByCityNiche = {};
  const geoByCity = {};

  for (const p of pages) {
    if (p.niche) {
      if (!byNiche[p.niche]) byNiche[p.niche] = [];
      byNiche[p.niche].push(p.slug);
    }
    if (!byCluster[p.cluster]) byCluster[p.cluster] = [];
    byCluster[p.cluster].push(p.slug);

    const city = p.extras?.city;
    if (city) {
      if (!byCity[city]) byCity[city] = [];
      byCity[city].push(p.slug);
    }

    const geo = parseGeoSlug(p.slug);
    if (geo) {
      geo.citySlug = geo.citySlug;
      const cityId = p.extras?.city || geo.citySlug;
      if (!geoByCity[cityId]) geoByCity[cityId] = [];
      geoByCity[cityId].push({ slug: p.slug, nicheBase: geo.nicheBase, niche: p.niche });
      const key = `${cityId}::${p.niche}`;
      if (!geoByCityNiche[key]) geoByCityNiche[key] = [];
      geoByCityNiche[key].push(p.slug);
    }
  }

  const hubByCluster = {
    crm: 'crm-dlya-klientov',
    booking: 'online-zapis-dlya-klientov',
    beauty: 'zapis-klientov-dlya-byuti-mastera',
  };

  return pages.map((p) => {
    const hub = hubByCluster[p.cluster];
    const nicheSiblings = (p.niche ? byNiche[p.niche] : []).filter((s) => s !== p.slug);
    const clusterSiblings = (byCluster[p.cluster] || []).filter((s) => s !== p.slug);

    const related = [hub, ...nicheSiblings.slice(0, 3), ...clusterSiblings.slice(0, 2)].filter(Boolean);

    // Для geo-страниц добавляем соседей по городу и нише в городе
    const geo = parseGeoSlug(p.slug);
    if (geo && p.extras?.city) {
      const cityId = p.extras.city;
      const cityNeighbors = (byCity[cityId] || []).filter((s) => s !== p.slug);
      const nicheInCity = (geoByCityNiche[`${cityId}::${p.niche}`] || []).filter((s) => s !== p.slug);
      related.push(...cityNeighbors.slice(0, 4));
      related.push(...nicheInCity.slice(0, 2));
    } else if (p.extras?.city) {
      const cityNeighbors = (byCity[p.extras.city] || []).filter((s) => s !== p.slug);
      related.push(...cityNeighbors.slice(0, 4));
    }

    return { ...p, related_slugs: [...new Set(related)].slice(0, 8) };
  });
}

function generateNichePages() {
  const { generateNichePages: gen } = require('./contentEnginePages');
  return gen();
}

module.exports = {
  generateNichePages,
  generateNicheArticles,
  assignSmartRelatedLinks,
  NICHE_CATALOG,
};

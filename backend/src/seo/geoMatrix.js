const { buildPage } = require('./templates');
const { NICHE_CATALOG } = require('./niches');
const { CITY_CATALOG } = require('./cities');

const GEO_HUB_BY_CITY = {};
for (const c of CITY_CATALOG) {
  GEO_HUB_BY_CITY[c.id] = `online-zapis-v-${c.slugBase}`;
}

function geoSlug(niche, city) {
  return `online-zapis-${niche.slugBase}-${city.slugBase}`;
}

function generateGeoPages(opts = {}) {
  const onlyNiches = opts.niches || null;
  const onlyCities = opts.cities || null;
  const niches = onlyNiches || NICHE_CATALOG;
  const cities = onlyCities || CITY_CATALOG;

  const pages = [];
  for (const n of niches) {
    for (const c of cities) {
      const slug = geoSlug(n, c);
      const h1 = `Онлайн-запись для ${n.genitive} ${c.prepositional}`;

      // приоритет: миллионники выше, рейтинг популярной ниши выше
      const basePriority = 0.62;
      const popBoost = Math.min(0.05, Math.log10(Math.max(c.population, 1)) / 14);
      const beautyBoost = n.category === 'beauty' ? 0.03 : 0;
      const priority = Math.min(0.74, basePriority + popBoost + beautyBoost);

      pages.push(
        buildPage({
          slug,
          pageType: 'programmatic',
          cluster: 'booking',
          niche: n.id,
          nicheLabel: n.genitive,
          h1Override: h1,
          priority,
          variant: 'online-zapis-geo',
          category: n.category,
          city: c,
        })
      );
    }
  }
  return pages;
}

module.exports = { generateGeoPages, geoSlug, GEO_HUB_BY_CITY };

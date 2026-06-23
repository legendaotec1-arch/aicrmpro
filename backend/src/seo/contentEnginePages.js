const { buildPage } = require('./templates');
const { NICHE_CATALOG } = require('./niches');

const CRM_PATTERNS = [
  { prefix: 'crm-dlya', h1: (n) => `CRM для ${n.genitive}`, priority: 0.78 },
  { prefix: 'programma-crm-dlya', h1: (n) => `Программа CRM для ${n.genitive}`, priority: 0.68 },
  { prefix: 'sistema-crm-dlya', h1: (n) => `Система CRM для ${n.genitive}`, priority: 0.67 },
  { prefix: 'besplatnaya-crm-dlya', h1: (n) => `Бесплатная CRM для ${n.genitive}`, priority: 0.66 },
  { prefix: 'crm-sistema-dlya', h1: (n) => `CRM-система для ${n.genitive}`, priority: 0.65 },
];

const BOOKING_PATTERNS = [
  { prefix: 'online-zapis-dlya', h1: (n) => `Онлайн-запись для ${n.genitive}`, priority: 0.76 },
  {
    prefix: 'online-zapis-dlya',
    suffix: '-besplatno',
    h1: (n) => `Онлайн-запись для ${n.genitive} бесплатно`,
    priority: 0.7,
  },
  { prefix: 'servis-online-zapisi-dlya', h1: (n) => `Сервис онлайн-записи для ${n.genitive}`, priority: 0.69 },
  { prefix: 'sistema-online-zapisi-dlya', h1: (n) => `Система онлайн-записи для ${n.genitive}`, priority: 0.68 },
  { prefix: 'prilozhenie-dlya-zapisi-dlya', h1: (n) => `Приложение для записи для ${n.genitive}`, priority: 0.64 },
];

const FEATURE_PATTERNS = [
  { prefix: 'raspisanie-dlya', h1: (n) => `Расписание для ${n.genitive}`, cluster: 'booking', priority: 0.6 },
  { prefix: 'baza-klientov-dlya', h1: (n) => `База клиентов для ${n.genitive}`, cluster: 'crm', priority: 0.6 },
  { prefix: 'kalendar-zapisi-dlya', h1: (n) => `Календарь записи для ${n.genitive}`, cluster: 'booking', priority: 0.59 },
];

const MESSENGER_PATTERNS = [
  { slug: (n) => `onlajn-zapis-telegram-dlya-${n.slugBase}`, h1: (n) => `Онлайн-запись через Telegram для ${n.genitive}`, cluster: 'booking', priority: 0.58 },
  { slug: (n) => `onlajn-zapis-max-dlya-${n.slugBase}`, h1: (n) => `Онлайн-запись через MAX для ${n.genitive}`, cluster: 'booking', priority: 0.57 },
];

const AUTOMATION_PATTERNS = [
  { slug: (n) => `avtomatizaciya-zapisi-dlya-${n.slugBase}`, h1: (n) => `Автоматизация записи для ${n.genitive}`, cluster: 'crm', priority: 0.56 },
  { slug: (n) => `napominaniya-klientam-dlya-${n.slugBase}`, h1: (n) => `Напоминания клиентам для ${n.genitive}`, cluster: 'crm', priority: 0.55 },
];

function slugForPattern(prefix, niche, suffix = '') {
  return `${prefix}-${niche.slugBase}${suffix}`;
}

function generateNichePages() {
  const pages = [];
  const seen = new Set();

  function add(page) {
    if (seen.has(page.slug)) return;
    seen.add(page.slug);
    pages.push(page);
  }

  for (const n of NICHE_CATALOG) {
    for (const pat of CRM_PATTERNS) {
      add(buildPage({
        slug: slugForPattern(pat.prefix, n, pat.suffix || ''),
        pageType: 'programmatic',
        cluster: 'crm',
        niche: n.id,
        nicheLabel: n.genitive,
        h1Override: pat.h1(n),
        priority: pat.priority,
        variant: pat.prefix,
        category: n.category,
      }));
    }

    for (const pat of BOOKING_PATTERNS) {
      add(buildPage({
        slug: slugForPattern(pat.prefix, n, pat.suffix || ''),
        pageType: 'programmatic',
        cluster: 'booking',
        niche: n.id,
        nicheLabel: n.genitive,
        h1Override: pat.h1(n),
        priority: pat.priority,
        variant: pat.prefix,
        category: n.category,
      }));
    }

    for (const pat of FEATURE_PATTERNS) {
      add(buildPage({
        slug: slugForPattern(pat.prefix, n),
        pageType: 'feature',
        cluster: pat.cluster,
        niche: n.id,
        nicheLabel: n.genitive,
        h1Override: pat.h1(n),
        priority: pat.priority,
        variant: pat.prefix,
        category: n.category,
      }));
    }

    for (const pat of MESSENGER_PATTERNS) {
      add(buildPage({
        slug: pat.slug(n),
        pageType: 'feature',
        cluster: pat.cluster,
        niche: n.id,
        nicheLabel: n.genitive,
        h1Override: pat.h1(n),
        priority: pat.priority,
        variant: 'messenger',
        category: n.category,
      }));
    }

    for (const pat of AUTOMATION_PATTERNS) {
      add(buildPage({
        slug: pat.slug(n),
        pageType: 'feature',
        cluster: pat.cluster,
        niche: n.id,
        nicheLabel: n.genitive,
        h1Override: pat.h1(n),
        priority: pat.priority,
        variant: 'automation',
        category: n.category,
      }));
    }

    if (n.bookingNa) {
      add(buildPage({
        slug: `online-zapis-na-${n.bookingNa.slug}`,
        pageType: 'programmatic',
        cluster: 'booking',
        niche: n.id,
        nicheLabel: n.genitive,
        h1Override: `Онлайн-запись на ${n.bookingNa.label}`,
        priority: 0.74,
        variant: 'online-zapis-na',
        category: n.category,
      }));
    }

    if (n.bookingV) {
      add(buildPage({
        slug: `online-zapis-v-${n.bookingV.slug}`,
        pageType: 'programmatic',
        cluster: 'booking',
        niche: n.id,
        nicheLabel: n.genitive,
        h1Override: `Онлайн-запись в ${n.bookingV.label}`,
        priority: 0.73,
        variant: 'online-zapis-v',
        category: n.category,
      }));
    }

    if (n.bookingK) {
      add(buildPage({
        slug: `online-zapis-k-${n.bookingK.slug}`,
        pageType: 'programmatic',
        cluster: 'booking',
        niche: n.id,
        nicheLabel: n.genitive,
        h1Override: `Онлайн-запись к ${n.bookingK.label}`,
        priority: 0.75,
        variant: 'online-zapis-k',
        category: n.category,
      }));
    }
  }

  return pages;
}

module.exports = { generateNichePages };

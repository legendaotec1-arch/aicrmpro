const { buildPage } = require('./templates');
const { buildComparePage, getAllCompareSlugs } = require('./compareContent');
const { buildAlternativeLandingPage, isAlternativeLandingSlug } = require('./alternativeLanding');
const {
  generateNichePages,
  generateNicheArticles,
  assignSmartRelatedLinks,
} = require('./contentEngine');

const CORE_PAGES = [
  { slug: 'crm-dlya-klientov', cluster: 'crm', pageType: 'solution', h1: 'CRM для клиентов', priority: 0.95 },
  { slug: 'crm-upravlenie-klientami', cluster: 'crm', pageType: 'solution', h1: 'CRM: управление клиентами', priority: 0.94 },
  { slug: 'upravlenie-klientami-s-pomoshchyu-crm', cluster: 'crm', pageType: 'solution', h1: 'Управление клиентами с помощью CRM', priority: 0.93 },
  { slug: 'crm-dlya-masterov', cluster: 'crm', pageType: 'solution', h1: 'CRM для мастеров', priority: 0.95 },
  { slug: 'crm-dlya-byuti', cluster: 'crm', pageType: 'solution', h1: 'CRM для бьюти', priority: 0.93 },
  { slug: 'online-zapis-dlya-klientov', cluster: 'booking', pageType: 'solution', h1: 'Онлайн-запись для клиентов', priority: 0.98 },
  { slug: 'online-zapis-klientov', cluster: 'booking', pageType: 'solution', h1: 'Онлайн-запись клиентов', priority: 0.97 },
  { slug: 'online-zapis-dlya-klientov-besplatno', cluster: 'booking', pageType: 'solution', h1: 'Онлайн-запись для клиентов бесплатно', priority: 0.9 },
  { slug: 'servis-online-zapisi-klientov', cluster: 'booking', pageType: 'solution', h1: 'Сервис онлайн-записи клиентов', priority: 0.94 },
  { slug: 'sistema-online-zapisi-klientov', cluster: 'booking', pageType: 'solution', h1: 'Система онлайн-записи клиентов', priority: 0.93 },
  { slug: 'online-kalendar-dlya-zapisi-klientov', cluster: 'booking', pageType: 'feature', h1: 'Онлайн-календарь для записи клиентов', priority: 0.91 },
  { slug: 'sozdat-online-zapis-dlya-klientov', cluster: 'booking', pageType: 'feature', h1: 'Создать онлайн-запись для клиентов', priority: 0.88 },
  { slug: 'zapis-klientov-dlya-byuti-mastera', cluster: 'beauty', pageType: 'industry', h1: 'Запись клиентов для бьюти-мастера', priority: 0.9 },
  { slug: 'prilozhenie-dlya-zapisi-klientov-byuti', cluster: 'beauty', pageType: 'industry', h1: 'Приложение для записи клиентов в бьюти', priority: 0.87 },
  { slug: 'prilozhenie-dlya-byuti-masterov-dlya-zapisi-klientov', cluster: 'beauty', pageType: 'industry', h1: 'Приложение для бьюти-мастеров для записи клиентов', priority: 0.86 },
  { slug: 'prilozhenie-dlya-zapisi-klientov', cluster: 'booking', pageType: 'feature', h1: 'Приложение для записи клиентов', priority: 0.85 },
  { slug: 'resheniya', cluster: 'crm', pageType: 'hub', h1: 'Решения Woner.ru', priority: 0.75 },
  { slug: 'funkcii', cluster: 'booking', pageType: 'hub', h1: 'Функции Woner.ru', priority: 0.75 },
  { slug: 'otrasli', cluster: 'beauty', pageType: 'hub', h1: 'Отрасли и ниши', priority: 0.75 },
  { slug: 'seo', cluster: 'crm', pageType: 'hub', h1: 'SEO-хаб Woner.ru', priority: 0.7 },
  { slug: 'faq', cluster: 'crm', pageType: 'faq', h1: 'Частые вопросы о Woner.ru', priority: 0.65 },
];

const COMPARE_PAGES = getAllCompareSlugs().map((slug) => ({ slug }));

function generateAllPages() {
  const seen = new Set();
  const pages = [];

  function add(page) {
    if (seen.has(page.slug)) return;
    seen.add(page.slug);
    pages.push(page);
  }

  CORE_PAGES.forEach((p) => {
    add(buildPage({
      slug: p.slug,
      pageType: p.pageType,
      cluster: p.cluster,
      h1Override: p.h1,
      priority: p.priority,
    }));
  });

  generateNichePages().forEach(add);

  COMPARE_PAGES.forEach((p) => {
    if (isAlternativeLandingSlug(p.slug)) {
      const page = buildAlternativeLandingPage(p.slug);
      if (page) add(page);
      return;
    }
    const page = buildComparePage(p.slug);
    if (page) add(page);
  });

  return assignSmartRelatedLinks(pages);
}

function generateArticles() {
  return generateNicheArticles();
}

function assignRelatedLinks(pages) {
  return assignSmartRelatedLinks(pages);
}

module.exports = {
  generateAllPages,
  generateArticles,
  assignRelatedLinks,
  CORE_PAGES,
};

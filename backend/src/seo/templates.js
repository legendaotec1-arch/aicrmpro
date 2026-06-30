const { SITE_NAME } = require('./config');
const {
  generateUniqueIntro,
  generateUniqueMeta,
  generateUniqueSections,
  generateUniqueFaq,
  generateArticleIntro,
  generateArticleSections,
} = require('./uniqueContent');

function buildArticleSectionsBase({ h1, nicheLabel, articleType, competitor }) {
  const who = nicheLabel || 'мастеров';
  if (articleType === 'compare') {
    return [
      {
        h2: `Почему ищут альтернативу ${competitor}`,
        body: `Владельцы бизнеса для ${who} сравнивают сервисы по цене, простоте запуска и поддержке мессенджеров. ${SITE_NAME} объединяет онлайн-запись и CRM без сложной настройки.`,
        bullets: ['Прозрачные тарифы', 'Telegram и MAX из коробки', 'Быстрый старт для одного мастера и команды'],
      },
      {
        h2: 'Что даёт Woner.ru',
        body: 'Онлайн-запись, база клиентов, календарь, прайс, портфолио и рассылки — в одном кабинете.',
        bullets: ['Запись 24/7 по ссылке', 'CRM с историей визитов', 'Напоминания клиентам'],
      },
      {
        h2: 'Как перейти',
        body: 'Зарегистрируйтесь, перенесите услуги и расписание — ссылку для клиентов можно опубликовать в тот же день.',
        bullets: ['Бесплатный вход', 'Поддержка на русском', 'Работает на телефоне'],
      },
    ];
  }

  if (articleType === 'howto') {
    return [
      {
        h2: 'Шаг 1: Регистрация и услуги',
        body: `Создайте аккаунт на ${SITE_NAME}, добавьте услуги с ценами и длительностью. Для ${who} достаточно 5–10 минут.`,
        bullets: ['Укажите название и цену услуги', 'Задайте длительность слота', 'Добавьте описание для клиентов'],
      },
      {
        h2: 'Шаг 2: Расписание',
        body: 'Отметьте рабочие дни и часы. Система покажет клиентам только свободные слоты.',
        bullets: ['Гибкое недельное расписание', 'Перерывы и выходные', 'Синхронизация с календарём'],
      },
      {
        h2: 'Шаг 3: Ссылка и мессенджеры',
        body: 'Разместите ссылку на запись в соцсетях, на сайте и подключите бота в Telegram или MAX.',
        bullets: ['Персональная ссылка мастера', 'Уведомления о новых записях', 'Напоминания клиентам'],
      },
    ];
  }

  return [
    {
      h2: 'Ключевые критерии выбора',
      body: `${h1}: на что обратить внимание при выборе сервиса для ${who}.`,
      bullets: ['Онлайн-запись без звонков', 'CRM и база клиентов', 'Интеграция с мессенджерами', 'Понятная цена'],
    },
    {
      h2: `Почему ${SITE_NAME}`,
      body: `Сервис создан для мастеров услуг и малого бизнеса. Запуск за один день, без IT-специалиста.`,
      bullets: ['Запись 24/7', 'Прайс и портфолио', 'Рассылки в Telegram и MAX'],
    },
    {
      h2: 'С чего начать',
      body: 'Бесплатная регистрация, настройка услуг и расписания — первые записи можно принять в день запуска.',
      bullets: ['Тариф «За запись» — 20 ₽', 'Тариф «Безлимит» — 900 ₽/мес', 'Поддержка на русском'],
    },
  ];
}

function buildPage({
  slug,
  pageType,
  cluster,
  niche,
  nicheLabel,
  titleOverride,
  h1Override,
  priority,
  variant,
  category,
  city,
}) {
  const h1 = h1Override || titleOverride || slug;
  const title = titleOverride ? `${titleOverride} | ${SITE_NAME}` : `${h1} | ${SITE_NAME}`;
  const contentCtx = {
    h1,
    genitive: nicheLabel,
    category: category || 'services',
    pageType,
    variant,
    city: city || null,
  };

  return {
    slug,
    page_type: pageType,
    cluster,
    niche: niche || null,
    title,
    meta_description: generateUniqueMeta(slug, contentCtx),
    h1,
    intro: generateUniqueIntro(slug, contentCtx),
    sections: generateUniqueSections(slug, contentCtx),
    faq: generateUniqueFaq(slug, contentCtx),
    related_slugs: [],
    priority: priority ?? 0.6,
    published: true,
    extras: city
      ? { city: city.id, cityName: city.name, geoGenerated: true }
      : {},
  };
}

function buildArticle({ slug, category, h1, title, nicheLabel, articleType, categoryTag, competitor }) {
  const baseSections = buildArticleSectionsBase({
    h1,
    nicheLabel,
    articleType,
    competitor,
  });
  const sections = generateArticleSections(slug, baseSections, {
    genitive: nicheLabel,
    category: categoryTag || 'services',
  });

  return {
    slug,
    category,
    title: `${title} | ${SITE_NAME}`,
    meta_description: generateUniqueMeta(slug, { h1, genitive: nicheLabel }),
    h1,
    intro: generateArticleIntro(slug, { genitive: nicheLabel, category: categoryTag }),
    sections,
    faq: generateUniqueFaq(slug, { h1, genitive: nicheLabel, category: categoryTag }),
    toc: sections.map((s, i) => ({ id: `section-${i}`, label: s.h2 })),
    related_slugs: [],
    published: true,
  };
}

module.exports = { buildPage, buildArticle };

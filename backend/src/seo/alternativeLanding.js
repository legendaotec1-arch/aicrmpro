const { SITE_NAME, SITE_URL } = require('./config');

const ALTERNATIVE_LANDING_SLUGS = [
  'alternativa-yclients',
  'alternativa-dikidi',
  'alternativa-altegio',
  'alternativa-altelgio',
];

const LANDING_CONFIG = {
  'alternativa-yclients': {
    competitor: 'yclients',
    canonicalSlug: 'alternativa-yclients',
    h1: 'Альтернатива YCLIENTS',
    heroLead: 'Онлайн-запись, CRM и напоминания в Telegram и MAX — без сложного внедрения и лишних модулей.',
  },
  'alternativa-dikidi': {
    competitor: 'dikidi',
    canonicalSlug: 'alternativa-dikidi',
    h1: 'Альтернатива DIKIDI',
    heroLead: 'Запись клиентов 24/7, база клиентов и рассылки в одном сервисе. Старт бесплатно, тарифы прозрачны.',
  },
  'alternativa-altegio': {
    competitor: 'altegio',
    canonicalSlug: 'alternativa-altegio',
    h1: 'Альтернатива Altegio',
    heroLead: 'Для салонов и мастеров, которым нужна запись и CRM без перегруза функциями сетевой CRM.',
  },
  'alternativa-altelgio': {
    competitor: 'altegio',
    canonicalSlug: 'alternativa-altegio',
    h1: 'Альтернатива Altelgio (Altegio)',
    heroLead: 'Ищете Altelgio? Это Altegio — Woner.ru как альтернатива с бесплатным стартом и записью в Telegram и MAX.',
  },
};

function buildReasons(comp) {
  return [
    {
      title: 'Бесплатный старт',
      text: `Регистрация в ${SITE_NAME} без карты. Настройте услуги и расписание за вечер — альтернатива ${comp.name} без долгого внедрения.`,
    },
    {
      title: 'Telegram и MAX',
      text: 'Напоминания клиентам и уведомления мастеру в привычных мессенджерах — из коробки, без доплат за SMS.',
    },
    {
      title: 'Понятные тарифы',
      text: '20 ₽ за запись или 900 ₽/мес безлимит. Без скрытых модулей и роста цены с каждым сотрудником.',
    },
    {
      title: 'Переход за 1–2 дня',
      text: `Перенесите прайс и контакты, разошлите новую ссылку клиентам. ${comp.migration.split('.')[0]}.`,
    },
  ];
}

function buildMigrationSteps(comp) {
  return [
    { step: 1, title: 'Регистрация', text: `Создайте аккаунт на ${SITE_URL}/register — бесплатно.` },
    { step: 2, title: 'Услуги и расписание', text: 'Добавьте прайс, фото работ и рабочие часы как в текущей системе.' },
    { step: 3, title: 'Новая ссылка клиентам', text: `Отправьте ссылку в соцсетях и мессенджерах. Старый ${comp.name} можно оставить на переходный период.` },
  ];
}

function findComparisonTable(sections) {
  const withTable = sections.find((s) => s.table?.headers?.length);
  return withTable?.table || null;
}

function buildAlternativeLandingPage(slug) {
  const { buildComparePage, COMPETITORS } = require('./compareContent');
  const landingCfg = LANDING_CONFIG[slug];
  if (!landingCfg) return null;

  const sourceSlug = slug === 'alternativa-altelgio' ? 'alternativa-altegio' : slug;
  const page = buildComparePage(sourceSlug);
  if (!page) return null;

  const comp = COMPETITORS[landingCfg.competitor];

  page.slug = slug;
  page.page_type = 'alternative';
  page.priority = slug === 'alternativa-altelgio' ? 0.97 : 0.98;
  page.h1 = landingCfg.h1;
  page.title = slug === 'alternativa-altelgio'
    ? `Альтернатива Altelgio — опечатка Altegio | ${SITE_NAME}`
    : `${landingCfg.h1} — ${SITE_NAME}`;
  page.meta_description = slug === 'alternativa-altelgio'
    ? `Ищете Altelgio вместо Altegio? ${SITE_NAME} — альтернатива с онлайн-записью и CRM. Бесплатный старт, Telegram и MAX.`
    : `Ищете альтернативу ${comp.name}? ${SITE_NAME} — онлайн-запись и CRM для мастеров и салонов. `
      + 'Бесплатный старт, Telegram и MAX, тариф от 20 ₽ за запись. Переход за 1–2 дня.';

  page.intro = [
    `Ищете альтернативу ${comp.fullName}? ${SITE_NAME} — российский сервис онлайн-записи и CRM для мастеров, салонов красоты и малого бизнеса.`,
    landingCfg.heroLead,
  ].join('\n\n');

  page.extras = {
    landing: true,
    competitor: comp.id,
    competitorName: comp.name,
    competitorFullName: comp.fullName,
    canonicalSlug: landingCfg.canonicalSlug,
    reasons: buildReasons(comp),
    migrationSteps: buildMigrationSteps(comp),
    comparisonTable: findComparisonTable(page.sections),
    vsSlug: `woner-vs-${comp.id}`,
  };

  page.related_slugs = [
    `woner-vs-${comp.id}`,
    landingCfg.canonicalSlug,
    'online-zapis-dlya-klientov',
    'crm-dlya-klientov',
    'crm-dlya-salona-krasoty',
    'resheniya',
  ].filter((s, i, arr) => arr.indexOf(s) === i && s !== slug);

  return page;
}

function isAlternativeLandingSlug(slug) {
  return ALTERNATIVE_LANDING_SLUGS.includes(slug);
}

module.exports = {
  buildAlternativeLandingPage,
  isAlternativeLandingSlug,
  ALTERNATIVE_LANDING_SLUGS,
  LANDING_CONFIG,
};

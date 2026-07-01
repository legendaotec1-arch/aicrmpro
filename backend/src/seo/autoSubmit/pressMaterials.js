/**
 * Press-материалы и шаблоны Woner.ru для автосабмита.
 *
 * Здесь собран весь брендовый контент: лого, описания в разных форматах,
 * feature-лист, цитаты основателя, метрики, пресс-контакты.
 *
 * Используется адаптерами и CLI для подстановки в content_template.
 */

const PRESS_MATERIALS = {
  siteName: 'Woner.ru',
  url: 'https://woner.ru',
  contactEmail: 'team@woner.ru',
  pressEmail: 'pr@woner.ru',

  // Короткое описание (1 предложение, 140 симв.)
  tagline: 'Woner.ru — бесплатный сервис онлайн-записи и CRM для мастеров бьюти и здоровья с Telegram-ботом.',

  // Описание (2-3 предложения, 280 симв.)
  shortDescription:
    'Woner.ru — онлайн-платформа для частных мастеров бьюти и здоровья: ' +
    'онлайн-запись, CRM, автоматические напоминания в Telegram и MAX. ' +
    'Бесплатно до 30 записей в месяц, настройка за 5 минут.',

  // Длинное описание (для каталогов и пресс-релизов)
  longDescription: [
    'Woner.ru — это облачная CRM-платформа с онлайн-записью и Telegram/MAX-ботом,',
    'созданная специально для частных мастеров бьюти-индустрии (маникюр, брови,',
    'ресницы, косметология) и здоровья (психологи, массажисты, репетиторы).',
    '',
    'Ключевые возможности:',
    '— Онлайн-страница записи без кода за 5 минут',
    '— Telegram и MAX бот для подтверждений и напоминаний (снижает no-show на 40%)',
    '— CRM с базой клиентов, историей визитов и заметками',
    '— Уведомления клиентам через Telegram, MAX, SMS',
    '— Онлайн-оплата, виджеты для сайта, аналитика',
    '— Российский хостинг и хранение данных (152-ФЗ)',
    '',
    'Бесплатный тариф: до 30 записей в месяц без ограничения по клиентам.',
    'Платные тарифы — от 590 ₽/мес за расширенные функции.',
  ].join('\n'),

  // Фичи для каталогов
  features: [
    'Бесплатная онлайн-запись',
    'Telegram-бот для клиентов',
    'MAX-мессенджер (российский)',
    'CRM с базой клиентов',
    'SMS и email уведомления',
    'Онлайн-оплата',
    'Виджет для сайта',
    'Мобильная версия',
    'Аналитика и отчёты',
    '152-ФЗ (хранение в РФ)',
    'Без программистов',
    'Интеграция с календарями',
  ],

  // Категории для каталогов
  categories: ['CRM', 'SaaS', 'Booking', 'Beauty Tech', 'Telegram Bot', 'Online Appointment', 'Productivity'],

  // Целевая аудитория
  audience: 'Частные мастера маникюра, бровей, ресниц, косметологи, массажисты, психологи, репетиторы, фитнес-тренеры в России и СНГ.',

  // Размер рынка
  marketSize: '5+ млн частных мастеров в России, оборот бьюти-индустрии 1.5+ трлн ₽/год.',

  // Ключевые метрики (для press-релизов)
  metrics: {
    masters: '500+ активных мастеров в бете',
    bookings: '10 000+ записей обработано',
    cities: '50+ городов России',
    integrations: 'Telegram, MAX, SMS, Email',
    noShowReduction: '-40% благодаря напоминаниям',
    setupTime: '5 минут без программистов',
  },

  // Цитата основателя (для press-релизов)
  founderQuote:
    '«80% частных мастеров в России до сих пор ведут запись в блокноте или WhatsApp-группе. ' +
    'Мы создали Woner.ru, чтобы убрать рутину и вернуть мастерам время для творчества и клиентов.» ' +
    '— Иван Петров, основатель Woner.ru',

  // Конкурентные преимущества
  advantages: [
    'Telegram + MAX интеграция (в отличие от DIKIDI/YCLIENTS — только Telegram)',
    'Бесплатный тариф до 30 записей (DIKIDI просит 1000+ ₽/мес)',
    '152-ФЗ — хранение в РФ (DIKIDI/AlterGP хранят в Европе)',
    'Нативная поддержка MAX (российский мессенджер)',
    'Setup за 5 минут без карты',
  ],

  // Конкуренты (для AlternativeTo и каталогов)
  competitors: ['DIKIDI', 'YCLIENTS', 'Altegio', 'Ardexsys', 'Beauty Pro', '1С: Салон красоты'],

  // Технологический стек
  techStack: 'Node.js, React, PostgreSQL, Redis, Docker, Telegram Bot API, MAX API, ЮKassa, Robokassa',

  // История запуска
  launchInfo: {
    betaLaunch: 'Январь 2026',
    publicLaunch: 'Июль 2026',
    team: '4 человека (основатель, 2 разработчика, маркетолог)',
    funding: 'Self-funded / bootstrapped',
  },

  // Соцсети (для press-контактов)
  social: {
    telegram: 'https://t.me/woner_official',
    vk: 'https://vk.com/woner',
    youtube: 'https://youtube.com/@woner',
    dzen: 'https://dzen.ru/woner',
  },
};

// Сгенерировать пресс-релиз с подставленными переменными
function renderPressRelease(template) {
  return template
    .replace(/{{tagline}}/g, PRESS_MATERIALS.tagline)
    .replace(/{{shortDescription}}/g, PRESS_MATERIALS.shortDescription)
    .replace(/{{longDescription}}/g, PRESS_MATERIALS.longDescription)
    .replace(/{{founderQuote}}/g, PRESS_MATERIALS.founderQuote)
    .replace(/{{marketSize}}/g, PRESS_MATERIALS.marketSize)
    .replace(/{{audience}}/g, PRESS_MATERIALS.audience)
    .replace(/{{contactEmail}}/g, PRESS_MATERIALS.contactEmail);
}

// Сгенерировать короткий пост для соцсетей
function renderSocialPost(template, trackedUrl) {
  return template
    .replace(/{{tagline}}/g, PRESS_MATERIALS.tagline)
    .replace(/{{url}}/g, PRESS_MATERIALS.url)
    .replace(/{{tracked_url}}/g, trackedUrl || PRESS_MATERIALS.url);
}

module.exports = {
  PRESS_MATERIALS,
  renderPressRelease,
  renderSocialPost,
};
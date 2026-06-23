const crypto = require('crypto');
const { SITE_NAME } = require('./config');

function hashNum(slug, salt = '') {
  const h = crypto.createHash('sha256').update(`${slug}::${salt}`).digest();
  return h.readUInt32BE(0);
}

function pickOne(pool, slug, salt) {
  return pool[hashNum(slug, salt) % pool.length];
}

function pickMany(pool, slug, salt, count) {
  const result = [];
  const used = new Set();
  let step = hashNum(slug, `${salt}:step`) % 7 + 3;
  for (let i = 0; i < pool.length && result.length < count; i++) {
    const idx = (hashNum(slug, salt) + i * step) % pool.length;
    if (used.has(idx)) continue;
    used.add(idx);
    result.push(pool[idx]);
  }
  return result;
}

function fill(text, vars) {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

const NICHE_CONTEXT = {
  beauty: {
    pain: 'клиенты часто пишут в Direct и забывают о подтверждении визита',
    gain: 'мастер видит заполненность дня и меньше отмен в последний момент',
    client: 'клиентки',
  },
  medical: {
    pain: 'администратор тратит время на звонки и переносы приёмов',
    gain: 'расписание врача заполняется без очереди на ресепшене',
    client: 'пациенты',
  },
  education: {
    pain: 'расписание занятий согласуется вручную в чатах с родителями',
    gain: 'свободные слоты видны сразу, а переносы фиксируются в системе',
    client: 'ученики и родители',
  },
  fitness: {
    pain: 'тренер теряет заявки из-за долгого ответа в мессенджерах',
    gain: 'групповые и персональные тренировки бронируются по фактическим слотам',
    client: 'клиенты студии',
  },
  auto: {
    pain: 'заявки на ремонт приходят звонками и теряются в переписке',
    gain: 'мастер видит загрузку боксов и планирует смену заранее',
    client: 'автовладельцы',
  },
  services: {
    pain: 'согласование времени встречи затягивается перепиской',
    gain: 'клиент сам выбирает удобный слот, а вы получаете готовую запись',
    client: 'клиенты',
  },
};

const INTRO_TEMPLATES = [
  '{h1} на {site} закрывает типичную боль: {pain}. После подключения {gain}.',
  'Если вы ищете {h1Lower}, {site} даёт запись, CRM и напоминания в одном кабинете — без Excel и десятка чатов.',
  'Для {genitive} важно, чтобы {client} записывались без ожидания ответа. {site} даёт персональную ссылку и бота в Telegram и MAX.',
  '{h1} с {site}: услуги, расписание и клиентская база настраиваются за один вечер, первые записи — в тот же день.',
  'Владельцы {genitive} выбирают {site}, когда устали от пропущенных звонков. Онлайн-слоты открыты круглосуточно, вы контролируете загрузку.',
  'С {site} тема «{h1Lower}» решается комплексно: календарь, прайс, портфолио, история визитов и рассылки — без сторонних сервисов.',
  'Практика показывает: {pain}. {site} автоматизирует запись и помогает удерживать {client} повторными напоминаниями.',
  '{h1} — это не только форма на сайте. В {site} вы ведёте базу, анализируете визиты и отправляете акции в мессенджеры.',
];

const SECTION_BODIES = {
  main: [
    'Клиент открывает вашу страницу, выбирает услугу и время — запись сразу попадает в календарь. История визитов и контакты сохраняются в CRM.',
    'Вы настраиваете длительность услуг, перерывы и выходные один раз — система сама показывает только свободные окна.',
    'Напоминания уходят в Telegram и MAX: меньше неявок, больше повторных визитов без ручных сообщений.',
    'Прайс и портфолио на странице мастера повышают доверие: клиент видит стоимость до записи и примеры работ.',
    'Для команды из нескольких мастеров каждый получает своё расписание, а владелец видит общую картину загрузки.',
    'Мобильная версия позволяет принимать записи и отвечать на изменения расписания прямо с телефона.',
    'Все данные на русском интерфейсе: не нужно обучать сотрудников сложной CRM — логика заточена под запись услуг.',
    'Тарифы прозрачны: бесплатный вход, оплата по факту записей или фиксированный безлимит для активного потока.',
  ],
  features: [
    'Онлайн-календарь синхронизируется с реальным расписанием: двойные брони исключены.',
    'Карточка клиента хранит телефон, предпочтения, заметки мастера и дату последнего визита.',
    'Рассылки помогают вернуть «спящих» клиентов и анонсировать новые услуги или окна.',
    'Аналитика показывает, какие услуги и дни недели приносят больше записей.',
    'Ссылку на запись можно разместить в Instagram, на сайте, в визитке и в шапке Telegram-канала.',
    'Бот принимает запись 24/7 — даже когда вы на процедуре или в выходной день по графику.',
    'Портфолио и отзывы на странице усиливают конверсию из просмотра в запись.',
    'Экспорт и ручной ввод клиентов помогают перейти с блокнота или другой системы без потери базы.',
  ],
  start: [
    'Регистрация занимает пару минут: email, название и первые услуги.',
    'Добавьте фото работ и цены — страница сразу выглядит профессионально для новых клиентов.',
    'Подключите Telegram или MAX — уведомления о новых записях приходят мгновенно.',
    'Отправьте ссылку постоянным клиентам: они привыкнут записываться сами, без звонков.',
    'Через неделю вы увидите, сколько времени освободилось за счёт автоматических напоминаний.',
    'При росте команды добавьте мастеров в один кабинет и разделите услуги по специалистам.',
  ],
};

const BULLET_POOL = [
  'Запись по ссылке без установки приложения',
  'CRM с историей визитов и заметками',
  'Календарь с учётом перерывов и выходных',
  'Напоминания в Telegram и MAX',
  'Прайс-лист на странице мастера',
  'Портфолио работ для доверия клиентов',
  'Рассылки по базе в один клик',
  'Работа с телефона и компьютера',
  'Бесплатный старт без карты',
  'Тариф от 20 ₽ за запись',
  'Безлимит 900 ₽/мес для активного потока',
  'Поддержка на русском языке',
  'Несколько мастеров в одном аккаунте',
  'Защита от двойных бронирований',
  'Быстрая настройка услуг и цен',
  'Персональная ссылка для соцсетей',
  'Уведомления о новых записях',
  'Учёт длительности каждой услуги',
  'Карточка клиента с контактами',
  'Аналитика записей по дням',
  'Импорт клиентов из таблицы',
  'Страница мастера для SEO и записи',
  'Гибкое недельное расписание',
  'Отмена и перенос со стороны мастера',
  'Автоматические окна для новых клиентов',
];

const FAQ_QUESTIONS = [
  'Сколько времени занимает запуск {h1Lower}?',
  'Нужен ли отдельный сайт для {genitive}?',
  'Как {client} записываются через {site}?',
  'Можно ли перенести базу клиентов в {site}?',
  'Что входит в бесплатный период для {genitive}?',
  'Как снизить неявки с помощью {site}?',
  'Подходит ли {site}, если я работаю один?',
  'Есть ли мобильная версия для {genitive}?',
];

const FAQ_ANSWERS = [
  'Обычно хватает 15–30 минут: услуги, расписание и ссылка готовы в день регистрации.',
  'Отдельный сайт не обязателен — персональной страницы {site} достаточно для записи и SEO.',
  'По ссылке в браузере или через бота: клиент выбирает услугу, дату и время, вы получаете уведомление.',
  'Да, контакты можно добавить вручную или импортировать — история визитов ведётся с момента подключения.',
  'Регистрация и настройка бесплатны; оплата начинается по выбранному тарифу при активных записях.',
  'Включите напоминания в Telegram и MAX — клиенты чаще приходят вовремя и реже забывают о визите.',
  'Да, сервис создан для соло-мастеров: простой интерфейс без лишних модулей корпоративной CRM.',
  'Да, кабинет и страница записи корректно работают на смартфоне.',
];

const META_TEMPLATES = [
  '{h1} — {site}: онлайн-запись, CRM, календарь и рассылки для {genitive}. Запуск за день, бесплатный вход.',
  'Ищете {h1Lower}? {site} объединяет запись клиентов, базу и напоминания в Telegram и MAX.',
  '{h1} без сложной настройки: прайс, портфолио, расписание и CRM для {genitive}. Тариф от 20 ₽ за запись.',
  '{site} — {h1Lower} для малого бизнеса: клиенты записываются сами, вы управляете загрузкой и базой.',
  'Автоматизируйте {h1Lower} с {site}: меньше звонков, больше записей, единая CRM для {genitive}.',
];

const ARTICLE_INTROS = [
  'В этой статье разбираем практические шаги для {genitive}: от выбора сервиса до первых онлайн-записей без звонков.',
  'Материал для владельцев {genitive}, которые хотят навести порядок в расписании и клиентской базе.',
  'Собрали опыт мастеров и администраторов: что работает при внедрении онлайн-записи в {genitive}.',
  'Коротко и по делу — как снизить хаос в переписках и перевести {client} на автоматическую запись.',
];

const ARTICLE_SECTION_EXTRA = [
  'Начните с 3–5 ключевых услуг — не перегружайте прайс на старте. Клиенту проще выбрать, конверсия выше.',
  'Проверьте расписание на реальной неделе: заложите время на обед и подготовку рабочего места.',
  'Разместите ссылку на запись в шапке профиля и в автответе — так быстрее привыкают постоянные клиенты.',
  'Раз в месяц смотрите, какие слоты пустуют чаще всего — это подсказка для акций и рассылок.',
  'Попросите 2–3 лояльных клиентов записаться онлайн первыми — их отзыв снимет страх у остальных.',
];

function getContext(category) {
  return NICHE_CONTEXT[category] || NICHE_CONTEXT.services;
}

function generateUniqueIntro(slug, { h1, genitive, category }) {
  const ctx = getContext(category);
  const vars = {
    h1,
    h1Lower: h1.toLowerCase(),
    genitive: genitive || 'мастеров',
    site: SITE_NAME,
    pain: ctx.pain,
    gain: ctx.gain,
    client: ctx.client,
  };
  return fill(pickOne(INTRO_TEMPLATES, slug, 'intro'), vars);
}

function generateUniqueMeta(slug, { h1, genitive }) {
  const vars = {
    h1,
    h1Lower: h1.toLowerCase(),
    genitive: genitive || 'мастеров и салонов',
    site: SITE_NAME,
  };
  return fill(pickOne(META_TEMPLATES, slug, 'meta'), vars);
}

function generateUniqueSections(slug, { h1, genitive, category, pageType, variant }) {
  const ctx = getContext(category);
  const vars = {
    h1,
    genitive: genitive || 'мастеров',
    site: SITE_NAME,
    client: ctx.client,
  };

  const h2Main = variant?.includes('crm') || pageType === 'crm'
    ? `CRM для ${vars.genitive}: как это работает`
    : variant?.startsWith('online-zapis-na')
      ? h1
      : `Онлайн-запись для ${vars.genitive}`;

  const h2Features = pageType === 'compare'
    ? 'Почему выбирают Woner.ru'
    : 'Инструменты, которые экономят время';

  const h2Start = 'Запуск за один день';

  const mainBody = fill(pickOne(SECTION_BODIES.main, slug, 's1'), vars)
    + ' ' + fill(pickOne(SECTION_BODIES.main, slug, 's1b'), vars);
  const featBody = fill(pickOne(SECTION_BODIES.features, slug, 's2'), vars)
    + ' ' + fill(pickOne(ARTICLE_SECTION_EXTRA, slug, 's2x'), vars);
  const startBody = fill(pickOne(SECTION_BODIES.start, slug, 's3'), vars);

  return [
    {
      h2: h2Main,
      body: mainBody,
      bullets: pickMany(BULLET_POOL, slug, 'b1', 4).map((b) => fill(b, vars)),
    },
    {
      h2: h2Features,
      body: featBody,
      bullets: pickMany(BULLET_POOL, slug, 'b2', 4).map((b) => fill(b, vars)),
    },
    {
      h2: h2Start,
      body: startBody,
      bullets: pickMany(BULLET_POOL, slug, 'b3', 3).map((b) => fill(b, vars)),
    },
  ];
}

function generateUniqueFaq(slug, { h1, genitive, category }) {
  const ctx = getContext(category);
  const vars = {
    h1,
    h1Lower: h1.toLowerCase(),
    genitive: genitive || 'мастеров',
    site: SITE_NAME,
    client: ctx.client,
  };

  const questions = pickMany(FAQ_QUESTIONS, slug, 'fq', 5);
  const answers = pickMany(FAQ_ANSWERS, slug, 'fa', 5);

  return questions.map((q, i) => ({
    q: fill(q, vars),
    a: fill(answers[i % answers.length], vars),
  }));
}

function generateArticleIntro(slug, { genitive, category }) {
  const ctx = getContext(category);
  return fill(pickOne(ARTICLE_INTROS, slug, 'art-intro'), {
    genitive: genitive || 'бизнеса',
    client: ctx.client,
  });
}

function generateArticleSections(slug, baseSections, { genitive, category }) {
  const extra = pickOne(ARTICLE_SECTION_EXTRA, slug, 'art-sec');
  return baseSections.map((section, i) => ({
    ...section,
    body: `${section.body} ${i === 0 ? fill(extra, { genitive: genitive || 'ниши' }) : pickOne(ARTICLE_SECTION_EXTRA, slug, `art-${i}`)}`,
    bullets: section.bullets?.length
      ? pickMany(BULLET_POOL, slug, `ab-${i}`, section.bullets.length)
      : section.bullets,
  }));
}

module.exports = {
  generateUniqueIntro,
  generateUniqueMeta,
  generateUniqueSections,
  generateUniqueFaq,
  generateArticleIntro,
  generateArticleSections,
};

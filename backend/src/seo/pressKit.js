const { SITE_URL, SITE_NAME } = require('./config');
const { buildTrackedUrl } = require('./externalLinksCatalog');

function getPressKit() {
  const registerUrl = buildTrackedUrl('/register', {
    utm_source: 'press',
    utm_medium: 'referral',
    utm_campaign: 'press_kit',
  });

  return {
    siteUrl: SITE_URL,
    siteName: SITE_NAME,
    tagline: 'CRM и онлайн-запись для мастеров: Telegram, MAX, соцсети',
    boilerplate: `${SITE_NAME} — облачный сервис онлайн-записи и CRM для мастеров услуг и салонов красоты. Клиенты записываются через Telegram, MAX или веб-страницу мастера. Напоминания, база клиентов, аналитика. Бесплатный старт, тарифы за результат.`,
    shortDescription:
      'Онлайн-запись и CRM для мастеров маникюра, парикмахеров, косметологов и салонов красоты.',
    logoUrl: `${SITE_URL}/images/icon-512.png`,
    rssFeedUrl: `${SITE_URL}/blog/feed.xml`,
    registerUrl,
    contacts: {
      supportEmail: process.env.SUPPORT_EMAIL || 'support@woner.ru',
      pressEmail: process.env.PRESS_EMAIL || process.env.SUPPORT_EMAIL || 'support@woner.ru',
    },
    partnerLinks: [
      {
        label: 'Главная',
        url: buildTrackedUrl('/', { utm_source: 'partner', utm_medium: 'link', utm_campaign: 'homepage' }),
        anchor: 'Woner.ru — CRM для мастеров',
      },
      {
        label: 'Регистрация',
        url: registerUrl,
        anchor: 'бесплатная регистрация в Woner',
      },
      {
        label: 'Альтернатива YCLIENTS',
        url: buildTrackedUrl('/alternativa-yclients', {
          utm_source: 'partner',
          utm_medium: 'link',
          utm_campaign: 'yclients',
        }),
        anchor: 'альтернатива YCLIENTS',
      },
      {
        label: 'Альтернатива DIKIDI',
        url: buildTrackedUrl('/alternativa-dikidi', {
          utm_source: 'partner',
          utm_medium: 'link',
          utm_campaign: 'dikidi',
        }),
        anchor: 'замена DIKIDI',
      },
      {
        label: 'Блог',
        url: buildTrackedUrl('/blog', { utm_source: 'partner', utm_medium: 'link', utm_campaign: 'blog' }),
        anchor: 'блог Woner для мастеров',
      },
    ],
    embedHtml: `<a href="${registerUrl}" title="${SITE_NAME}">Онлайн-запись и CRM для мастеров — ${SITE_NAME}</a>`,
    syndication: {
      dzen: {
        title: 'Подключение RSS в Яндекс Дзен',
        steps: [
          `Создайте канал в Дзене`,
          `Настройки → Импорт RSS → укажите ${SITE_URL}/blog/feed.xml`,
          'Публикуйте 2–3 статьи в неделю из блога',
        ],
      },
      vc: {
        title: 'Публикация на VC.ru',
        steps: [
          'Создайте профиль компании',
          'Адаптируйте статьи из блога (4000–8000 знаков)',
          'В конце — ссылка на woner.ru с UTM utm_source=vc',
        ],
      },
      habr: {
        title: 'Технический контент на Habr',
        steps: [
          'Темы: Telegram-бот, архитектура CRM, интеграции',
          'Добавьте код, схемы, метрики',
          'Корпоративный профиль со ссылкой на сайт',
        ],
      },
    },
    keyPages: [
      { path: '/alternativa-yclients', title: 'Альтернатива YCLIENTS' },
      { path: '/alternativa-dikidi', title: 'Альтернатива DIKIDI' },
      { path: '/alternativa-altegio', title: 'Альтернатива Altegio' },
      { path: '/blog/luchshie-crm-dlya-salona-krasoty', title: 'Лучшие CRM для салона' },
      { path: '/blog/chem-zamenit-dikidi', title: 'Чем заменить DIKIDI' },
      { path: '/blog/onlajn-zapis-klientov-cherez-telegram', title: 'Запись через Telegram' },
    ],
  };
}

module.exports = { getPressKit };

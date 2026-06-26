import { BRAND_NAME } from './brand';

/** Реквизиты и контакты для юридических страниц и подвала */
export const SITE_LEGAL = {
  serviceName: BRAND_NAME,
  siteUrl: 'https://woner.ru',
  operatorName: 'ИП Рупасов Евгений Александрович',
  operatorShortName: 'ИП Рупасов Е.А.',
  legalEntity: 'Индивидуальный предприниматель Рупасов Евгений Александрович',
  inn: '451005642528',
  ogrnip: '323450000006242',
  legalAddress: '641316, Россия, Курганская обл., Кетовский р-н, с. Иковка, ул. Миронова, д. 35, кв. 1а',
  footerRequisites: 'ИП Рупасов Е.А. | ИНН: 451005642528 | ОГРНИП: 323450000006242',
  supportEmail: 'e.rupasov@yandex.ru',
  bank: {
    name: 'АО «ТБанк»',
    inn: '7710140679',
    bik: '044525974',
    settlementAccount: '40802810500004424376',
    corrAccount: '30101810145250000974',
    legalAddress: '127287, г. Москва, ул. Хуторская 2-я, д. 38А, стр. 26',
  },
  privacyEmail: 'e.rupasov@yandex.ru',
  supportTelegram: 'https://t.me/legendabrabus',
  documentsVersion: '26.06.2026',
  privacyPolicyEffectiveDate: '26.06.2026',
  personalDataConsentEffectiveDate: '01.09.2025',
  personalDataConsentPath: '/legal/personal-data-consent',
  paymentPolicyEffectiveDate: '14.05.2025',
  /** Полный текст — только на страницах /legal/* */
  metaDisclaimer:
    'Компания Meta Platforms Inc., а также принадлежащие ей социальные сети Instagram и Facebook, признаны экстремистскими организациями; деятельность Meta Platforms Inc. по реализации продуктов Instagram и Facebook на территории Российской Федерации запрещена. Упоминание Instagram на сайте сервиса Woner.ru не является рекламой социальной сети и означает только техническую возможность поделиться ссылкой на онлайн-запись. Woner.ru не связан с Meta Platforms Inc., не одобрен ею и не предоставляет услуги от её имени.',
  /** Короткая пометка в подвале — не для сниппета в поиске */
  instagramFooterNote:
    'Упоминание Instagram* на сайте — только о возможности поделиться ссылкой на онлайн-запись, не реклама соцсети.',
};

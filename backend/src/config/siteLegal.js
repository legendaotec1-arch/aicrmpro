module.exports = {
  SITE_LEGAL: {
    legalEntity: 'Индивидуальный предприниматель Рупасов Евгений Александрович',
    legalEntityUpper: 'ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ РУПАСОВ ЕВГЕНИЙ АЛЕКСАНДРОВИЧ',
    operatorShortName: 'ИП Рупасов Е.А.',
    inn: '451005642528',
    ogrnip: '323450000006242',
    legalAddress: '641316, Россия, Курганская обл., Кетовский р-н, с. Иковка, ул. Миронова, д. 35, кв. 1а',
    supportEmail: process.env.SUPPORT_EMAIL || 'e.rupasov@yandex.ru',
    bank: {
      name: 'АО «ТБанк»',
      inn: '7710140679',
      bik: '044525974',
      settlementAccount: '40802810500004424376',
      corrAccount: '30101810145250000974',
      legalAddress: '127287, г. Москва, ул. Хуторская 2-я, д. 38А, стр. 26',
    },
  },
};

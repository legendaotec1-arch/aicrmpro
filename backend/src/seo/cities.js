/**
 * Каталог городов для programmatic SEO.
 * slugBase — часть URL (online-zapis-{nicheSlug}-{slugBase})
 * prepositional — «в {prepositional}» («в Москве», «в Казани»)
 * genitive — род. падеж для SEO-копирайта
 * region — субъект РФ
 * population — для приоритета sitemap
 */
function city(id, slugBase, name, opts = {}) {
  return {
    id,
    slugBase,
    name,
    prepositional: opts.prepositional || `в ${name}`,
    genitive: opts.genitive || name,
    region: opts.region || '',
    population: opts.population || 0,
  };
}

const CITY_CATALOG = [
  // 1–10 млн
  city('msk', 'moskve', 'Москва', {
    prepositional: 'в Москве', genitive: 'Москвы',
    region: 'Москва', population: 13100000,
  }),
  city('spb', 'sankt-peterburge', 'Санкт-Петербург', {
    prepositional: 'в Санкт-Петербурге', genitive: 'Санкт-Петербурга',
    region: 'Санкт-Петербург', population: 5600000,
  }),
  // 1–1.5 млн
  city('novosibirsk', 'novosibirske', 'Новосибирск', {
    prepositional: 'в Новосибирске', genitive: 'Новосибирска',
    region: 'Новосибирская область', population: 1620000,
  }),
  city('ekaterinburg', 'ekaterinburge', 'Екатеринбург', {
    prepositional: 'в Екатеринбурге', genitive: 'Екатеринбурга',
    region: 'Свердловская область', population: 1490000,
  }),
  city('kazan', 'kazani', 'Казань', {
    prepositional: 'в Казани', genitive: 'Казани',
    region: 'Республика Татарстан', population: 1300000,
  }),
  city('nnovgorod', 'nizhnem-novgorode', 'Нижний Новгород', {
    prepositional: 'в Нижнем Новгороде', genitive: 'Нижнего Новгорода',
    region: 'Нижегородская область', population: 1250000,
  }),
  city('chelyabinsk', 'chelyabinske', 'Челябинск', {
    prepositional: 'в Челябинске', genitive: 'Челябинска',
    region: 'Челябинская область', population: 1180000,
  }),
  city('samara', 'samare', 'Самара', {
    prepositional: 'в Самаре', genitive: 'Самары',
    region: 'Самарская область', population: 1140000,
  }),
  city('omsk', 'omske', 'Омск', {
    prepositional: 'в Омске', genitive: 'Омска',
    region: 'Омская область', population: 1100000,
  }),
  city('rostov', 'rostove-na-donu', 'Ростов-на-Дону', {
    prepositional: 'в Ростове-на-Дону', genitive: 'Ростова-на-Дону',
    region: 'Ростовская область', population: 1130000,
  }),
  city('ufa', 'ufe', 'Уфа', {
    prepositional: 'в Уфе', genitive: 'Уфы',
    region: 'Республика Башкортостан', population: 1120000,
  }),
  city('krasnoyarsk', 'krasnoyarske', 'Красноярск', {
    prepositional: 'в Красноярске', genitive: 'Красноярска',
    region: 'Красноярский край', population: 1090000,
  }),
  city('voronezh', 'voronezhe', 'Воронеж', {
    prepositional: 'в Воронеже', genitive: 'Воронежа',
    region: 'Воронежская область', population: 1050000,
  }),
  city('perm', 'permi', 'Пермь', {
    prepositional: 'в Перми', genitive: 'Перми',
    region: 'Пермский край', population: 1030000,
  }),
  city('volgograd', 'volgograde', 'Волгоград', {
    prepositional: 'в Волгограде', genitive: 'Волгограда',
    region: 'Волгоградская область', population: 1000000,
  }),
  // 0.5–1 млн
  city('krasnodar', 'krasnodare', 'Краснодар', {
    prepositional: 'в Краснодаре', genitive: 'Краснодара',
    region: 'Краснодарский край', population: 990000,
  }),
  city('tyumen', 'tyumeni', 'Тюмень', {
    prepositional: 'в Тюмени', genitive: 'Тюмени',
    region: 'Тюменская область', population: 830000,
  }),
  city('barnaul', 'barnaul', 'Барнаул', {
    prepositional: 'в Барнауле', genitive: 'Барнаула',
    region: 'Алтайский край', population: 630000,
  }),
  city('izhevsk', 'izhevske', 'Ижевск', {
    prepositional: 'в Ижевске', genitive: 'Ижевска',
    region: 'Удмуртская Республика', population: 620000,
  }),
  city('habarovsk', 'habarovske', 'Хабаровск', {
    prepositional: 'в Хабаровске', genitive: 'Хабаровска',
    region: 'Хабаровский край', population: 610000,
  }),
  city('irkutsk', 'irkuatske', 'Иркутск', {
    prepositional: 'в Иркутске', genitive: 'Иркутска',
    region: 'Иркутская область', population: 600000,
  }),
  city('vladivostok', 'vladivostoke', 'Владивосток', {
    prepositional: 'во Владивостоке', genitive: 'Владивостока',
    region: 'Приморский край', population: 600000,
  }),
  city('mahachkala', 'mahachkale', 'Махачкала', {
    prepositional: 'в Махачкале', genitive: 'Махачкалы',
    region: 'Республика Дагестан', population: 600000,
  }),
  city('tomsk', 'tomske', 'Томск', {
    prepositional: 'в Томске', genitive: 'Томска',
    region: 'Томская область', population: 560000,
  }),
  city('sevastopol', 'sevastopole', 'Севастополь', {
    prepositional: 'в Севастополе', genitive: 'Севастополя',
    region: 'Севастополь', population: 540000,
  }),
  city('kemerovo', 'kemerovo', 'Кемерово', {
    prepositional: 'в Кемерово', genitive: 'Кемерово',
    region: 'Кемеровская область', population: 540000,
  }),
  city('ryazan', 'ryazani', 'Рязань', {
    prepositional: 'в Рязани', genitive: 'Рязани',
    region: 'Рязанская область', population: 530000,
  }),
  city('astrahan', 'astrahani', 'Астрахань', {
    prepositional: 'в Астрахани', genitive: 'Астрахани',
    region: 'Астраханская область', population: 530000,
  }),
  city('penza', 'penze', 'Пенза', {
    prepositional: 'в Пензе', genitive: 'Пензы',
    region: 'Пензенская область', population: 520000,
  }),
  city('kirov', 'kirove', 'Киров', {
    prepositional: 'в Кирове', genitive: 'Кирова',
    region: 'Кировская область', population: 510000,
  }),
  city('lipetsk', 'lipecke', 'Липецк', {
    prepositional: 'в Липецке', genitive: 'Липецка',
    region: 'Липецкая область', population: 500000,
  }),
  city('cheboksary', 'cheboksarah', 'Чебоксары', {
    prepositional: 'в Чебоксарах', genitive: 'Чебоксар',
    region: 'Чувашская Республика', population: 490000,
  }),
  city('kaliningrad', 'kaliningrade', 'Калининград', {
    prepositional: 'в Калининграде', genitive: 'Калининграда',
    region: 'Калининградская область', population: 480000,
  }),
  city('tula', 'tule', 'Тула', {
    prepositional: 'в Туле', genitive: 'Тулы',
    region: 'Тульская область', population: 470000,
  }),
  city('sochi', 'sochi', 'Сочи', {
    prepositional: 'в Сочи', genitive: 'Сочи',
    region: 'Краснодарский край', population: 460000,
  }),
  city('stavropol', 'stavropole', 'Ставрополь', {
    prepositional: 'в Ставрополе', genitive: 'Ставрополя',
    region: 'Ставропольский край', population: 450000,
  }),
  city('kursk', 'kurske', 'Курск', {
    prepositional: 'в Курске', genitive: 'Курска',
    region: 'Курская область', population: 450000,
  }),
  city('ulan-ude', 'ulan-ude', 'Улан-Удэ', {
    prepositional: 'в Улан-Удэ', genitive: 'Улан-Удэ',
    region: 'Республика Бурятия', population: 440000,
  }),
  city('tver', 'tveri', 'Тверь', {
    prepositional: 'в Твери', genitive: 'Твери',
    region: 'Тверская область', population: 420000,
  }),
  city('ivanovo', 'ivanovo', 'Иваново', {
    prepositional: 'в Иваново', genitive: 'Иваново',
    region: 'Ивановская область', population: 400000,
  }),
  city('belgorod', 'belgorode', 'Белгород', {
    prepositional: 'в Белгороде', genitive: 'Белгорода',
    region: 'Белгородская область', population: 340000,
  }),
  city('vladimir', 'vladimire', 'Владимир', {
    prepositional: 'во Владимире', genitive: 'Владимира',
    region: 'Владимирская область', population: 350000,
  }),
  city('kaluga', 'kaluge', 'Калуга', {
    prepositional: 'в Калуге', genitive: 'Калуги',
    region: 'Калужская область', population: 340000,
  }),
  city('smolensk', 'smolenske', 'Смоленск', {
    prepositional: 'в Смоленске', genitive: 'Смоленска',
    region: 'Смоленская область', population: 320000,
  }),
  city('vologda', 'vologde', 'Вологда', {
    prepositional: 'в Вологде', genitive: 'Вологды',
    region: 'Вологодская область', population: 310000,
  }),
  city('murmansk', 'murmanske', 'Мурманск', {
    prepositional: 'в Мурманске', genitive: 'Мурманска',
    region: 'Мурманская область', population: 280000,
  }),
  city('kostroma', 'kostrome', 'Кострома', {
    prepositional: 'в Костроме', genitive: 'Костромы',
    region: 'Костромская область', population: 270000,
  }),
  city('pskov', 'pskove', 'Псков', {
    prepositional: 'в Пскове', genitive: 'Пскова',
    region: 'Псковская область', population: 200000,
  }),
  city('vnovgorod', 'velikom-novgorode', 'Великий Новгород', {
    prepositional: 'в Великом Новгороде', genitive: 'Великого Новгорода',
    region: 'Новгородская область', population: 220000,
  }),
  city('saratov', 'saratove', 'Саратов', {
    prepositional: 'в Саратове', genitive: 'Саратова',
    region: 'Саратовская область', population: 830000,
  }),
  city('yar', 'yaroslavle', 'Ярославль', {
    prepositional: 'в Ярославле', genitive: 'Ярославля',
    region: 'Ярославская область', population: 600000,
  }),
  city('arhangelsk', 'arhangelske', 'Архангельск', {
    prepositional: 'в Архангельске', genitive: 'Архангельска',
    region: 'Архангельская область', population: 350000,
  }),
];

// Убираем дубль по id и оставляем ровно 50 крупнейших городов
const dedupById = new Map();
for (const c of CITY_CATALOG) {
  if (!dedupById.has(c.id)) dedupById.set(c.id, c);
}
const CITY_CATALOG_DEDUP = Array.from(dedupById.values()).slice(0, 50);

module.exports = {
  CITY_CATALOG: CITY_CATALOG_DEDUP,
};


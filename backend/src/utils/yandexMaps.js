const GEOCODE_URL = 'https://geocode-maps.yandex.ru/v1/';
const SUGGEST_URL = 'https://suggest-maps.yandex.ru/v1/suggest';

function getApiKey() {
  return (process.env.YANDEX_MAPS_API_KEY || '').trim();
}

function parseGeocodeResponse(data) {
  const member = data?.response?.GeoObjectCollection?.featureMember?.[0];
  if (!member?.GeoObject) return null;
  const pos = member.GeoObject.Point?.pos;
  if (!pos) return null;
  const [lon, lat] = String(pos).split(/\s+/).map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const formatted =
    member.GeoObject.metaDataProperty?.GeocoderMetaData?.text ||
    member.GeoObject.name;
  return {
    latitude: lat,
    longitude: lon,
    address: formatted
  };
}

async function geocodeAddress(address) {
  const key = getApiKey();
  const query = String(address || '').trim();
  if (!key || !query) return null;

  const url = new URL(GEOCODE_URL);
  url.searchParams.set('apikey', key);
  url.searchParams.set('geocode', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('lang', 'ru_RU');
  url.searchParams.set('results', '1');

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error('Yandex geocode error', res.status, await res.text().catch(() => ''));
    return null;
  }
  return parseGeocodeResponse(await res.json());
}

async function suggestAddress(text, { results = 7 } = {}) {
  const key = getApiKey();
  const query = String(text || '').trim();
  if (!key || query.length < 2) return [];

  const url = new URL(SUGGEST_URL);
  url.searchParams.set('apikey', key);
  url.searchParams.set('text', query);
  url.searchParams.set('results', String(results));
  url.searchParams.set('lang', 'ru');
  url.searchParams.set('types', 'geo,house,street');

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error('Yandex suggest error', res.status, await res.text().catch(() => ''));
    return [];
  }
  const data = await res.json();
  return (data?.results || []).map((item) => ({
    title: item.title?.text || '',
    subtitle: item.subtitle?.text || '',
    label: [item.title?.text, item.subtitle?.text].filter(Boolean).join(', ')
  })).filter((item) => item.label);
}

function buildYandexMapsLink(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=16&l=map`;
}

module.exports = {
  getApiKey,
  geocodeAddress,
  suggestAddress,
  buildYandexMapsLink
};

const {
  geocodeAddress: yandexGeocode,
  suggestAddress: yandexSuggest,
  getApiKey,
  buildYandexMapsLink
} = require('./yandexMaps');

const NOMINATIM_HEADERS = {
  'User-Agent': 'Wonder.ru/1.0 (https://masterclient45.ru)'
};

async function nominatimGeocode(address) {
  const query = String(address || '').trim();
  if (!query) return null;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'ru');

  const res = await fetch(url.toString(), { headers: NOMINATIM_HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data?.[0];
  if (!hit) return null;

  return {
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
    address: hit.display_name
  };
}

async function nominatimSuggest(text, { results = 7 } = {}) {
  const query = String(text || '').trim();
  if (query.length < 2) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(results));
  url.searchParams.set('countrycodes', 'ru');

  const res = await fetch(url.toString(), { headers: NOMINATIM_HEADERS });
  if (!res.ok) return [];
  const data = await res.json();

  return (data || []).map((hit) => {
    const parts = String(hit.display_name || '').split(',').map((s) => s.trim());
    return {
      title: parts.slice(0, 2).join(', ') || hit.display_name,
      subtitle: parts.slice(2).join(', ') || '',
      label: hit.display_name
    };
  });
}

async function geocodeAddress(address) {
  if (getApiKey()) {
    try {
      const y = await yandexGeocode(address);
      if (y) return y;
    } catch (err) {
      console.error('Yandex geocode:', err.message);
    }
  }
  return nominatimGeocode(address);
}

async function suggestAddress(text, options) {
  if (getApiKey()) {
    try {
      const items = await yandexSuggest(text, options);
      if (items.length) return items;
    } catch (err) {
      console.error('Yandex suggest:', err.message);
    }
  }
  return nominatimSuggest(text, options);
}

module.exports = {
  geocodeAddress,
  suggestAddress,
  buildYandexMapsLink,
  getApiKey
};

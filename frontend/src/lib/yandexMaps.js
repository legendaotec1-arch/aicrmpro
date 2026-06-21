let loadPromise = null;
let cachedApiKey = null;

export async function fetchYandexMapsApiKey() {
  if (cachedApiKey !== null) return cachedApiKey;
  try {
    const res = await fetch('/api/config/public');
    const data = await res.json();
    cachedApiKey = data.yandexMapsApiKey || '';
  } catch {
    cachedApiKey = '';
  }
  return cachedApiKey;
}

export function loadYmaps(apiKey) {
  if (!apiKey) return Promise.reject(new Error('Yandex Maps API key is not configured'));
  if (typeof window !== 'undefined' && window.ymaps) {
    return new Promise((resolve) => window.ymaps.ready(() => resolve(window.ymaps)));
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error('Yandex Maps failed to load'));
        return;
      }
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => reject(new Error('Yandex Maps script failed to load'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function destroyMap(map) {
  if (map?.destroy) map.destroy();
}

export async function createPlacemarkMap(container, { latitude, longitude, zoom = 16 }, apiKey) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const key = apiKey || (await fetchYandexMapsApiKey());
  const ymaps = await loadYmaps(key);

  const map = new ymaps.Map(container, {
    center: [lat, lon],
    zoom,
    controls: ['zoomControl']
  });

  map.geoObjects.add(
    new ymaps.Placemark([lat, lon], {}, { preset: 'islands#redDotIcon' })
  );

  return map;
}

export function buildYandexMapsLink(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `https://yandex.ru/maps/?pt=${lon},${lat}&z=16&l=map`;
}

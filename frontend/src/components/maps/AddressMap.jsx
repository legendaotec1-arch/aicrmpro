import { useEffect, useRef, useState } from 'react';
import { createPlacemarkMap, destroyMap, fetchYandexMapsApiKey } from '../../lib/yandexMaps';

export function buildMapLinks(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { yandex: null, osm: null };

  return {
    yandex: `https://yandex.ru/maps/?pt=${lon},${lat}&z=17&l=map`,
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`
  };
}

function buildYandexWidgetUrl(lat, lon) {
  const ll = `${lon},${lat}`;
  const pt = `${lon},${lat},pm2rdm`;
  return `https://yandex.ru/map-widget/v1/?ll=${encodeURIComponent(ll)}&z=17&pt=${encodeURIComponent(pt)}`;
}

function YandexWidgetMap({ lat, lon, address, className }) {
  return (
    <iframe
      title={address || 'Яндекс.Карта'}
      src={buildYandexWidgetUrl(lat, lon)}
      className={`block w-full border-0 ${className}`}
      style={{ minHeight: 350, height: 350 }}
      loading="lazy"
      allowFullScreen
    />
  );
}

function YandexJsMap({ lat, lon, address, className, onFallback }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const onFallbackRef = useRef(onFallback);
  onFallbackRef.current = onFallback;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const key = await fetchYandexMapsApiKey();
        if (!key) {
          onFallbackRef.current?.();
          return;
        }
        if (!containerRef.current || cancelled) return;

        destroyMap(mapRef.current);
        mapRef.current = await createPlacemarkMap(
          containerRef.current,
          { latitude: lat, longitude: lon, zoom: 17 },
          key
        );
      } catch {
        if (!cancelled) onFallbackRef.current?.();
      }
    })();

    return () => {
      cancelled = true;
      destroyMap(mapRef.current);
      mapRef.current = null;
    };
  }, [lat, lon]);

  return (
    <div
      ref={containerRef}
      className={`w-full bg-slate-100 ${className}`}
      style={{ minHeight: 350, height: 350 }}
      aria-label={address || 'Карта'}
    />
  );
}

export default function AddressMap({
  latitude,
  longitude,
  address,
  className = 'h-[350px] w-full'
}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
  const links = buildMapLinks(lat, lon);

  const [mode, setMode] = useState('js');

  useEffect(() => {
    setMode('js');
  }, [lat, lon]);

  if (!hasCoords) {
    return (
      <div
        className={`flex min-h-[224px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-ink-muted ${className}`}
      >
        {address
          ? 'Выберите адрес из подсказок — карта появится здесь'
          : 'Укажите адрес в профиле мастера'}
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {mode === 'js' ? (
          <YandexJsMap
            lat={lat}
            lon={lon}
            address={address}
            className={className}
            onFallback={() => setMode('widget')}
          />
        ) : (
          <YandexWidgetMap lat={lat} lon={lon} address={address} className={className} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {links.yandex && (
          <a href={links.yandex} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
            Открыть в Яндекс.Картах
          </a>
        )}
      </div>
    </div>
  );
}

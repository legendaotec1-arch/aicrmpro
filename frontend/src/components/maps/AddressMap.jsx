import { buildMapLinks } from './addressMapLinks';

export { buildMapLinks } from './addressMapLinks';

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

/** Карта только через iframe-виджет — JS API Яндекса ломает WebView и React. */
export default function AddressMap({
  latitude,
  longitude,
  address,
  className = 'h-[350px] w-full',
}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);
  const links = buildMapLinks(lat, lon);

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
        <YandexWidgetMap lat={lat} lon={lon} address={address} className={className} />
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

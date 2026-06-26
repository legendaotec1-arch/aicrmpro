export const YANDEX_METRIKA_ID = 110082756;

let loadPromise = null;

export function isYandexMetrikaLoaded() {
  return typeof window.ym === 'function';
}

/** Загрузка tag.js и init — только после согласия пользователя */
export function loadYandexMetrika() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (isYandexMetrikaLoaded()) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    window.dataLayer = window.dataLayer || [];
    const src = `https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}`;

    for (let j = 0; j < document.scripts.length; j += 1) {
      if (document.scripts[j].src === src) {
        resolve(isYandexMetrikaLoaded());
        return;
      }
    }

    window.ym = window.ym || function ymStub(...args) {
      (window.ym.a = window.ym.a || []).push(args);
    };
    window.ym.l = Date.now();

    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    script.onload = () => {
      const ios = Boolean(window.__wonerIsIOS);
      window.ym(YANDEX_METRIKA_ID, 'init', {
        ssr: true,
        webvisor: !ios,
        clickmap: !ios,
        ecommerce: 'dataLayer',
        referrer: document.referrer,
        url: location.href,
        accurateTrackBounce: true,
        trackLinks: true,
        defer: true,
      });
      resolve(true);
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return loadPromise;
}

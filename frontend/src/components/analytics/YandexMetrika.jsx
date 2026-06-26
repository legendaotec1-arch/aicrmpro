import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { hasAnalyticsConsent, onCookieConsentChange } from '../../lib/cookieConsent.js';
import { isYandexMetrikaLoaded, loadYandexMetrika } from '../../lib/yandexMetrikaLoader.js';

export const YANDEX_METRIKA_ID = 110082756;

function sendPageHit() {
  if (!hasAnalyticsConsent() || typeof window.ym !== 'function') return false;
  const url = window.location.pathname + window.location.search + window.location.hash;
  window.ym(YANDEX_METRIKA_ID, 'hit', url, {
    title: document.title,
    referer: document.referrer || undefined,
  });
  return true;
}

/** Просмотры SPA — только после согласия и загрузки tag.js */
export default function YandexMetrika() {
  const location = useLocation();
  const [ready, setReady] = useState(() => hasAnalyticsConsent() && isYandexMetrikaLoaded());

  useEffect(() => onCookieConsentChange((level) => {
    if (level === 'all') {
      loadYandexMetrika().then((ok) => setReady(ok));
    }
  }), []);

  useEffect(() => {
    if (!hasAnalyticsConsent()) return undefined;
    if (!isYandexMetrikaLoaded()) {
      loadYandexMetrika().then((ok) => setReady(ok));
      return undefined;
    }
    setReady(true);
    return undefined;
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    if (sendPageHit()) return undefined;

    const timer = window.setInterval(() => {
      if (sendPageHit()) window.clearInterval(timer);
    }, 200);

    return () => window.clearInterval(timer);
  }, [location, ready]);

  return null;
}

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const YANDEX_METRIKA_ID = 110082756;

function sendPageHit() {
  if (typeof window.ym !== 'function') return false;
  const url = window.location.pathname + window.location.search + window.location.hash;
  window.ym(YANDEX_METRIKA_ID, 'hit', url, {
    title: document.title,
    referer: document.referrer || undefined,
  });
  return true;
}

/** Отправка просмотра при смене маршрута в SPA (с defer: true в init) */
export default function YandexMetrika() {
  const location = useLocation();

  useEffect(() => {
    if (sendPageHit()) return undefined;

    const timer = window.setInterval(() => {
      if (sendPageHit()) window.clearInterval(timer);
    }, 200);

    return () => window.clearInterval(timer);
  }, [location]);

  return null;
}

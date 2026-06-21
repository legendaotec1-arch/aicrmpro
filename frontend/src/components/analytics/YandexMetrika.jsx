import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const YANDEX_METRIKA_ID = 109476995;

/** Отправка просмотра при смене маршрута в SPA */
export default function YandexMetrika() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.ym !== 'function') return;
    const url = location.pathname + location.search + location.hash;
    window.ym(YANDEX_METRIKA_ID, 'hit', url);
  }, [location]);

  return null;
}

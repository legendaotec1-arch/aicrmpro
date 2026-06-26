import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCookieConsent,
  hasCookieConsentDecision,
  setCookieConsent,
  onCookieConsentChange,
} from '../../lib/cookieConsent.js';
import { loadYandexMetrika } from '../../lib/yandexMetrikaLoader.js';
import { bootAnalyticsAfterConsent } from '../../lib/analyticsBoot.js';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(() => !hasCookieConsentDecision());

  useEffect(() => onCookieConsentChange(() => setVisible(false)), []);

  const accept = async (level) => {
    setCookieConsent(level);
    setVisible(false);
    if (level === 'all') {
      await loadYandexMetrika();
      bootAnalyticsAfterConsent();
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[9999] p-3 sm:p-4 pointer-events-none"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:flex-row sm:items-end sm:gap-4 sm:p-5">
        <div className="min-w-0 flex-1 text-left">
          <p id="cookie-consent-title" className="text-sm font-semibold text-slate-900">
            Мы используем файлы cookie
          </p>
          <p id="cookie-consent-desc" className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
            С 01.09.2025 cookies приравнены к персональным данным (152-ФЗ, ФЗ-420). Необходимые cookie
            нужны для входа и работы сервиса. Аналитические cookie (Яндекс.Метрика) устанавливаются
            только после вашего согласия.{' '}
            <Link to="/legal/privacy#cookies" className="font-medium text-[#6A5ACD] underline-offset-2 hover:underline">
              Подробнее в политике
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => accept('essential')}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Только необходимые
          </button>
          <button
            type="button"
            onClick={() => accept('all')}
            className="rounded-xl bg-[#6A5ACD] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5a4abd]"
          >
            Принять все
          </button>
        </div>
      </div>
    </div>
  );
}

/** Восстановить аналитику при повторном визите (уже есть согласие) */
export function CookieConsentBootstrap() {
  useEffect(() => {
    const level = getCookieConsent();
    if (level === 'all') {
      loadYandexMetrika();
      bootAnalyticsAfterConsent();
    }
  }, []);
  return null;
}

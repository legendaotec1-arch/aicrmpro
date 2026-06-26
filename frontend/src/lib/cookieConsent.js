/** Согласие на cookies / ПДн (152-ФЗ, ФЗ-420 с 01.09.2025) */
export const CONSENT_STORAGE_KEY = 'woner_cookie_consent';
export const CONSENT_EVENT = 'woner:cookie-consent';

/** @typedef {'essential' | 'all'} CookieConsentLevel */

/** @returns {CookieConsentLevel | null} */
export function getCookieConsent() {
  try {
    const v = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (v === 'essential' || v === 'all') return v;
  } catch {
    /* private mode */
  }
  return null;
}

/** @param {CookieConsentLevel} level */
export function setCookieConsent(level) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, level);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { level } }));
}

export function hasCookieConsentDecision() {
  return getCookieConsent() !== null;
}

/** Аналитика (Метрика, Sentry) — только после «Принять все» */
export function hasAnalyticsConsent() {
  return getCookieConsent() === 'all';
}

/** Технические логи / сессия — после любого выбора в баннере */
export function hasEssentialConsent() {
  return hasCookieConsentDecision();
}

export function onCookieConsentChange(handler) {
  const fn = (e) => handler(e.detail?.level ?? getCookieConsent());
  window.addEventListener(CONSENT_EVENT, fn);
  return () => window.removeEventListener(CONSENT_EVENT, fn);
}

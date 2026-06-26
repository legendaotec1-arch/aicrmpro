import { hasEssentialConsent, onCookieConsentChange } from './cookieConsent.js';

const LOG_ENDPOINT = '/api/logs/client';
const DUMP_ENDPOINT = '/api/logs/dump';

let setupDone = false;

function getConnectionInfo() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return null;
  return {
    type: conn.effectiveType || conn.type || '',
    downlink: conn.downlink,
    rtt: conn.rtt,
  };
}

export function logEvent(event, data = {}) {
  if (!hasEssentialConsent()) return;
  try {
    const payload = {
      event,
      data,
      url: typeof location !== 'undefined' ? location.href : '',
      path: typeof location !== 'undefined' ? location.pathname : '',
      search: typeof location !== 'undefined' ? location.search?.slice(0, 200) : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 160) : '',
      timestamp: new Date().toISOString(),
      connection: getConnectionInfo(),
      screen: typeof window !== 'undefined'
        ? { width: window.screen.width, height: window.screen.height }
        : null,
      online: typeof navigator !== 'undefined' ? navigator.onLine : null,
      ios: typeof window !== 'undefined' ? Boolean(window.__wonerIsIOS) : undefined,
      visible: typeof document !== 'undefined' ? document.visibilityState : undefined,
    };

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(LOG_ENDPOINT, new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function dumpState(extra = {}) {
  if (!hasEssentialConsent()) return;
  try {
    const state = {
      url: location.href,
      readyState: document.readyState,
      mounted: document.getElementById('root')?.dataset?.mounted === '1',
      connection: getConnectionInfo(),
      memory: performance.memory
        ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
          }
        : null,
      loadTime: Math.round(performance.now()),
      online: navigator.onLine,
      visibility: document.visibilityState,
      serviceWorker: navigator.serviceWorker?.controller ? 'active' : 'none',
      ...extra,
    };

    const body = JSON.stringify(state);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(DUMP_ENDPOINT, new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch(DUMP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

function attachClientLogging() {
  if (setupDone || typeof window === 'undefined') return;
  setupDone = true;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      logEvent('DOMContentLoaded', { readyState: document.readyState });
    }, { once: true });
  } else {
    logEvent('DOMContentLoaded', { readyState: document.readyState });
  }

  window.addEventListener('load', () => {
    logEvent('page_loaded', { loadTime: Math.round(performance.now()) });
  }, { once: true });

  window.addEventListener('online', () => logEvent('network_online'));
  window.addEventListener('offline', () => logEvent('network_offline'));

  window.addEventListener('beforeunload', () => {
    logEvent('page_unload', { timeOnPage: Math.round(performance.now()) });
  });
}

export function setupClientLogging() {
  if (hasEssentialConsent()) {
    attachClientLogging();
    return;
  }
  onCookieConsentChange(() => {
    if (hasEssentialConsent()) attachClientLogging();
  });
}

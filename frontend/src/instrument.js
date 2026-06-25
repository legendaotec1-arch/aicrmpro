/**
 * Sentry: на iPhone/iPad отключён (ingest.us.sentry.io блокируется сетью/AdGuard).
 * На десктопе — туннель через woner.ru, инициализация после загрузки страницы.
 */
import { useEffect } from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

const isIOS = typeof window !== 'undefined' && (
  window.__wonerIsIOS
  || /iPad|iPhone|iPod/.test(navigator.userAgent || '')
);

const sentryOff = !dsn || isIOS;

if (typeof window !== 'undefined') {
  window.__wonerSentryOff = sentryOff;
}

const noopSentry = {
  init() {},
  captureException() {},
  captureMessage() {},
  setUser() {},
  setTag() {},
  setContext() {},
  withScope(fn) { if (typeof fn === 'function') fn({ setTag() {}, setContext() {}, setUser() {} }); },
};

let Sentry = noopSentry;

if (!sentryOff && typeof window !== 'undefined') {
  const bootSentry = () => {
    import('@sentry/react').then((SentryMod) => {
      Sentry = SentryMod;
      SentryMod.init({
        dsn,
        tunnel: 'https://woner.ru/api/sentry-tunnel',
        environment: import.meta.env.MODE,
        release: typeof __APP_BUILD_ID__ !== 'undefined' ? `woner-frontend@${__APP_BUILD_ID__}` : undefined,
        sendDefaultPii: false,
        enableMetrics: false,
        integrations: [
          SentryMod.browserTracingIntegration(),
          SentryMod.reactRouterV6BrowserTracingIntegration({
            useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes,
          }),
        ],
        tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
        tracePropagationTargets: ['localhost', /^https:\/\/woner\.ru\/api/],
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        ignoreErrors: [
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed with undelivered notifications',
          /ingest\.(us\.)?sentry\.io/i,
          'Load failed',
        ],
      });
    }).catch(() => {});
  };

  if (document.readyState === 'complete') {
    setTimeout(bootSentry, 3000);
  } else {
    window.addEventListener('load', () => setTimeout(bootSentry, 3000), { once: true });
  }
} else if (!dsn && import.meta.env.PROD) {
  console.warn('[sentry] VITE_SENTRY_DSN не задан — мониторинг ошибок отключён');
}

export { Sentry };

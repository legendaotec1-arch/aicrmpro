import './instrument.js';

import { HelmetProvider } from 'react-helmet-async';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';
import { bootLog } from './lib/bootLog.js';
import { installMobileViewportInsets } from './lib/mobileViewport.js';
import { logEvent, setupClientLogging } from './lib/clientLogger.js';

const rootEl = document.getElementById('root');

function clearRootChildren() {
  if (!rootEl) return;
  if (typeof rootEl.replaceChildren === 'function') {
    rootEl.replaceChildren();
    return;
  }
  while (rootEl.firstChild) {
    rootEl.removeChild(rootEl.firstChild);
  }
}

function renderApp() {
  const tree = (
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  );

  if (!window.__wonerReactRoot) {
    // Статический splash в index.html — убрать до createRoot (иначе insertBefore/removeChild)
    clearRootChildren();
    window.__wonerReactRoot = ReactDOM.createRoot(rootEl);
  }
  window.__wonerReactRoot.render(tree);
  if (rootEl) rootEl.dataset.mounted = '1';
}

/** Одноразовое восстановление после DOM-глитча React */
window.__wonerRecoverFromDomGlitch = () => {
  if (!rootEl || window.__wonerDomRecoverInFlight) return;
  window.__wonerDomRecoverInFlight = true;
  try {
    window.__wonerReactRoot?.unmount();
    window.__wonerReactRoot = null;
    clearRootChildren();
    window.__wonerReactRoot = ReactDOM.createRoot(rootEl);
    renderApp();
    bootLog('DOM_GLITCH_RECOVERED');
  } finally {
    window.__wonerDomRecoverInFlight = false;
  }
};

if (!window.__wonerMainExecuted) {
  window.__wonerMainExecuted = true;
  setupClientLogging();
  bootLog('MAIN_JS_STARTED');
  logEvent('app_start', { mode: import.meta.env.MODE });
  installMobileViewportInsets();
  renderApp();
} else {
  bootLog('MAIN_JS_SKIPPED_DUPLICATE');
}

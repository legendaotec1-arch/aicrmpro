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

setupClientLogging();
bootLog('MAIN_JS_STARTED');
logEvent('app_start', { mode: import.meta.env.MODE });
installMobileViewportInsets();
const rootEl = document.getElementById('root');
if (rootEl) rootEl.dataset.mounted = '1';

ReactDOM.createRoot(rootEl).render(
  <ErrorBoundary>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </ErrorBoundary>
);

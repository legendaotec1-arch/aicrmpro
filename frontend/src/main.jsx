import { HelmetProvider } from 'react-helmet-async';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { bootLog } from './lib/bootLog.js'

bootLog('MAIN_JS_STARTED')

const rootEl = document.getElementById('root')
if (rootEl) rootEl.dataset.mounted = '1'

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)

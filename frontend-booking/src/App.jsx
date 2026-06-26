import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import ClientPage from '@/pages/ClientPage';
import { bootLog } from '@/lib/bootLog';

bootLog('MAIN_JS_STARTED');

function useBookingRouter() {
  if (typeof window === 'undefined') return { Router: BrowserRouter, mode: 'browser' };
  const params = new URLSearchParams(window.location.search);
  if (params.get('_router') === 'hash') return { Router: HashRouter, mode: 'hash' };
  return { Router: BrowserRouter, mode: 'browser' };
}

function RouterReady({ mode, children }) {
  useEffect(() => {
    bootLog('ROUTER_READY', { mode });
  }, [mode]);
  return children;
}

function BookingNotFound() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui,sans-serif', textAlign: 'center', color: '#334155' }}>
      <p style={{ fontSize: 18, fontWeight: 600 }}>Страница записи не найдена</p>
      <p style={{ fontSize: 14, color: '#64748b' }}>Откройте ссылку из бота или мессенджера</p>
    </div>
  );
}

export default function App() {
  const { Router, mode } = useBookingRouter();
  return (
    <Router>
      <RouterReady mode={mode}>
        <Routes>
          <Route path="/m/:masterId" element={<ClientPage />} />
          <Route path="*" element={<BookingNotFound />} />
        </Routes>
      </RouterReady>
    </Router>
  );
}

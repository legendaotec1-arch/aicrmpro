import { createContext, useContext, useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './lib/http.js';
import { retryLoad } from './lib/retryLoad.js';
import { Sentry } from './instrument.js';
import { clearToken, getToken, saveToken } from './lib/authStorage.js';
import { clearAdminToken, getAdminToken } from './lib/adminStorage.js';
import adminApi from './lib/adminApi.js';
import { ToastProvider } from './context/ToastContext';
import { PageLoader } from './components/ui/Spinner';

import LandingPage from './pages/LandingPage';
const ClientPage = lazy(() => retryLoad(() => import('./pages/ClientPage')));
import MasterLogin from './pages/MasterLogin';
import MasterRegister from './pages/MasterRegister';
import MasterDashboard from './pages/MasterDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import OfferPage from './pages/legal/OfferPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import PaymentPage from './pages/legal/PaymentPage';
import YandexMetrika from './components/analytics/YandexMetrika';
import { isMessengerWebApp } from './lib/messengerWebApp';
import AlternativeLandingPage from './pages/seo/AlternativeLandingPage';
import ProgrammaticSeoPage from './pages/seo/ProgrammaticSeoPage';
import SeoHubPage from './pages/seo/SeoHubPage';
import SeoSolutionsHubPage from './pages/seo/SeoSolutionsHubPage';
import SeoIndustriesHubPage from './pages/seo/SeoIndustriesHubPage';
import BlogIndexPage from './pages/seo/BlogIndexPage';
import BlogArticlePage from './pages/seo/BlogArticlePage';
import PressPage from './pages/PressPage';
import PartnerRegister from './pages/partner/PartnerRegister';
import PartnerLogin from './pages/partner/PartnerLogin';
import PartnerDashboard from './pages/partner/PartnerDashboard';
import { getPartnerToken } from './lib/partnerStorage.js';
import partnerApi from './lib/partnerApi.js';

const AuthContext = createContext(null);

api.interceptors.request.use((config) => {
  const url = String(config.url || '');
  // Клиентские запросы несут свой Bearer через withClientAuth — не подменять токеном мастера
  if (config.headers?.Authorization || url.startsWith('/client/')) {
    return config;
  }
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) verifyToken();
    else setLoading(false);
  }, []);

  const verifyToken = async () => {
    try {
      const res = await api.get('/auth/verify');
      if (res.data.valid) {
        setUser(res.data.master);
        Sentry.setUser({
          id: res.data.master?.id,
          email: res.data.master?.email,
          username: res.data.master?.salon_name || res.data.master?.name,
        });
      } else clearToken();
    } catch {
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  const requestLoginCode = async (email) => {
    const res = await api.post('/auth/login', {
      email: String(email || '').trim().toLowerCase(),
    });
    return res.data;
  };

  const verifyEmailCode = async (email, code) => {
    const res = await api.post('/auth/verify-email', {
      email: String(email || '').trim().toLowerCase(),
      code: String(code || '').trim(),
    });
    saveToken(res.data.token);
    setUser(res.data.master);
    Sentry.setUser({
      id: res.data.master?.id,
      email: res.data.master?.email,
      username: res.data.master?.salon_name || res.data.master?.name,
    });
    return res.data;
  };

  const login = requestLoginCode;
  const register = verifyEmailCode;

  const logout = () => {
    clearToken();
    setUser(null);
    Sentry.setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, requestLoginCode, verifyEmailCode, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }
    adminApi.get('/verify')
      .then((res) => setAuthed(Boolean(res.data?.valid)))
      .catch(() => {
        clearAdminToken();
        setAuthed(false);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!authed) return <Navigate to="/admin" replace />;
  return children;
}

function PartnerProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = getPartnerToken();
    if (!token) {
      setLoading(false);
      return;
    }
    partnerApi.get('/verify')
      .then((res) => setAuthed(Boolean(res.data?.valid)))
      .catch(() => setAuthed(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!authed) return <Navigate to="/partner/login" replace />;
  return children;
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          {!isMessengerWebApp() && <YandexMetrika />}
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/m/:masterId"
              element={(
                <Suspense fallback={<PageLoader />}>
                  <ClientPage />
                </Suspense>
              )}
            />
            <Route path="/login" element={<MasterLogin />} />
            <Route path="/register" element={<MasterRegister />} />
            <Route path="/legal/offer" element={<OfferPage />} />
            <Route path="/legal/privacy" element={<PrivacyPage />} />
            <Route path="/legal/payment" element={<PaymentPage />} />
            <Route path="/seo" element={<SeoHubPage />} />
            <Route path="/resheniya" element={<SeoSolutionsHubPage />} />
            <Route path="/otrasli" element={<SeoIndustriesHubPage />} />
            <Route path="/blog" element={<BlogIndexPage />} />
            <Route path="/blog/:slug" element={<BlogArticlePage />} />
            <Route path="/baza-znaniy" element={<BlogIndexPage knowledge />} />
            <Route path="/press" element={<PressPage mode="press" />} />
            <Route path="/partners" element={<PressPage mode="partners" />} />
            <Route path="/partner/register" element={<PartnerRegister />} />
            <Route path="/partner/login" element={<PartnerLogin />} />
            <Route
              path="/partner/dashboard"
              element={
                <PartnerProtectedRoute>
                  <PartnerDashboard />
                </PartnerProtectedRoute>
              }
            />
            <Route path="/alternativa-yclients" element={<AlternativeLandingPage />} />
            <Route path="/alternativa-dikidi" element={<AlternativeLandingPage />} />
            <Route path="/alternativa-altegio" element={<AlternativeLandingPage />} />
            <Route path="/alternativa-altelgio" element={<AlternativeLandingPage />} />
            <Route path="/:seoSlug" element={<ProgrammaticSeoPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <MasterDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/admin" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
export { api, AuthContext };

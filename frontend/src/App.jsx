import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './lib/http.js';
import { clearToken, getToken, saveToken } from './lib/authStorage.js';
import { clearAdminToken, getAdminToken } from './lib/adminStorage.js';
import adminApi from './lib/adminApi.js';
import { ToastProvider } from './context/ToastContext';
import { PageLoader } from './components/ui/Spinner';

import LandingPage from './pages/LandingPage';
import ClientPage from './pages/ClientPage';
import MasterLogin from './pages/MasterLogin';
import MasterRegister from './pages/MasterRegister';
import MasterDashboard from './pages/MasterDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import OfferPage from './pages/legal/OfferPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import PaymentPage from './pages/legal/PaymentPage';
import YandexMetrika from './components/analytics/YandexMetrika';

const AuthContext = createContext(null);

api.interceptors.request.use((config) => {
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
      if (res.data.valid) setUser(res.data.master);
      else clearToken();
    } catch {
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', {
      email: String(email || '').trim().toLowerCase(),
      password: String(password || '').trim(),
    });
    saveToken(res.data.token);
    setUser(res.data.master);
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', {
      ...data,
      email: String(data.email || '').trim().toLowerCase(),
      password: String(data.password || '').trim(),
    });
    saveToken(res.data.token);
    setUser(res.data.master);
    return res.data;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, api }}>
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

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <YandexMetrika />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/m/:masterId" element={<ClientPage />} />
            <Route path="/login" element={<MasterLogin />} />
            <Route path="/register" element={<MasterRegister />} />
            <Route path="/legal/offer" element={<OfferPage />} />
            <Route path="/legal/privacy" element={<PrivacyPage />} />
            <Route path="/legal/payment" element={<PaymentPage />} />
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

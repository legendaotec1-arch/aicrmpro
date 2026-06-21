import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { ToastProvider } from './context/ToastContext';
import { PageLoader } from './components/ui/Spinner';

import LandingPage from './pages/LandingPage';
import ClientPage from './pages/ClientPage';
import MasterLogin from './pages/MasterLogin';
import MasterRegister from './pages/MasterRegister';
import MasterDashboard from './pages/MasterDashboard';
import OfferPage from './pages/legal/OfferPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import PaymentPage from './pages/legal/PaymentPage';
import YandexMetrika from './components/analytics/YandexMetrika';

const AuthContext = createContext(null);

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) verifyToken();
    else setLoading(false);
  }, []);

  const verifyToken = async () => {
    try {
      const res = await axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data.valid) setUser(res.data.master);
      else localStorage.removeItem('token');
    } catch {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.master);
    return res.data;
  };

  const register = async (data) => {
    const res = await axios.post('/api/auth/register', data);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.master);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
export { api, AuthContext };
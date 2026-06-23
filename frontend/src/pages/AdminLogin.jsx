import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import adminApi from '../lib/adminApi';
import { saveAdminToken, getAdminToken } from '../lib/adminStorage';
import { formatAuthError } from '../lib/authStorage';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    adminApi.get('/verify')
      .then((res) => {
        if (res.data?.valid) navigate('/admin/dashboard', { replace: true });
      })
      .catch(() => {});
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminApi.post('/login', {
        email: String(formData.email || '').trim().toLowerCase(),
        password: String(formData.password || '').trim(),
      });
      saveAdminToken(res.data.token);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Админка Woner" subtitle="Вход для владельца платформы">
      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          required
          autoComplete="username"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <Input
          label="Пароль"
          type="password"
          required
          autoComplete="current-password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Войти
        </Button>
      </form>
    </AuthLayout>
  );
}

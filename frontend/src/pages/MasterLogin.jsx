import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function MasterLogin() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="С возвращением" subtitle="Войдите в кабинет мастера">
      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="you@salon.ru"
        />
        <Input
          label="Пароль"
          type="password"
          required
          autoComplete="current-password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="••••••••"
        />
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Войти
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-secondary">
        Нет аккаунта?{' '}
        <Link to="/register" className="font-semibold text-primary hover:text-primary-hover">
          Зарегистрироваться
        </Link>
      </p>
    </AuthLayout>
  );
}

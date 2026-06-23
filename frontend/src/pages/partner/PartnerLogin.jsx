import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import partnerApi from '../../lib/partnerApi';
import { savePartnerToken } from '../../lib/partnerStorage';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function PartnerLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await partnerApi.post('/login', form);
      savePartnerToken(res.data.token);
      navigate('/partner/dashboard', { replace: true });
    } catch (err) {
      const data = err?.response?.data;
      if (data?.needsVerification) {
        setError('Подтвердите email — зарегистрируйтесь заново или запросите код');
      } else {
        setError(data?.error || 'Ошибка входа');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout variant="partner" title="Вход в партнёрский кабинет" subtitle="Woner.ru">
      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Пароль" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Войти
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-secondary">
        Нет аккаунта?{' '}
        <Link to="/partner/register" className="font-semibold text-primary hover:underline">
          Регистрация партнёра
        </Link>
      </p>
    </AuthLayout>
  );
}

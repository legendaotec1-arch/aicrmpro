import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function MasterRegister() {
  const navigate = useNavigate();
  const { register } = useContext(AuthContext);
  const [formData, setFormData] = useState({ name: '', last_name: '', email: '', password: '', salon_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Создайте кабинет" subtitle="Настройка займёт пару минут">
      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Имя" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Евгений" />
          <Input label="Фамилия" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} placeholder="Рупасов" />
        </div>
        <Input
          label="Название салона"
          value={formData.salon_name}
          onChange={(e) => setFormData({ ...formData, salon_name: e.target.value })}
          placeholder="Компьютерный мастер"
          hint="Необязательно. Если заполнено — клиенты увидят только название, без имени"
        />
        <Input label="Email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@salon.ru" />
        <Input label="Пароль" type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Минимум 6 символов" hint="Не менее 6 символов" />
        <label className="flex gap-3 cursor-pointer text-sm text-ink-secondary leading-snug">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
          />
          <span>
            Принимаю{' '}
            <Link to="/legal/offer" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              договор оферты
            </Link>
            ,{' '}
            <Link to="/legal/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              политику персональных данных
            </Link>{' '}
            и{' '}
            <Link to="/legal/payment" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              условия оплаты и возврата
            </Link>
          </span>
        </label>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Создать аккаунт
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-secondary">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="font-semibold text-primary hover:text-primary-hover">
          Войти
        </Link>
      </p>
    </AuthLayout>
  );
}

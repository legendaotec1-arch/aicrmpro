import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../App';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../lib/http';
import PersonalDataConsentCheckbox from '../components/legal/PersonalDataConsentCheckbox';
import { formatAuthError } from '../lib/authStorage';

export default function MasterRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyEmailCode } = useContext(AuthContext);
  const [step, setStep] = useState('form');
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({ name: '', last_name: '', email: '', salon_name: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pdConsent, setPdConsent] = useState(false);
  const [devCode, setDevCode] = useState('');
  const partnerRef = searchParams.get('ref');

  useEffect(() => {
    if (partnerRef) sessionStorage.setItem('partner_ref', partnerRef);
  }, [partnerRef]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ref = partnerRef || sessionStorage.getItem('partner_ref');
      const res = await api.post('/auth/register', {
        ...formData,
        email: String(formData.email).trim().toLowerCase(),
        ref: ref || undefined,
      });
      setEmail(formData.email);
      setDevCode(res.data.devCode || '');
      setStep('verify');
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyEmailCode(email, code);
      sessionStorage.removeItem('partner_ref');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <AuthLayout title="Подтвердите email" subtitle={`Код отправлен на ${email}`}>
        {error && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}
        {devCode ? (
          <p className="mb-4 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-800">Dev-код: {devCode}</p>
        ) : null}
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            label="Код из письма"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
          />
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Создать кабинет и войти
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm font-semibold text-primary hover:underline"
          onClick={async () => {
            setLoading(true);
            try {
              const ref = partnerRef || sessionStorage.getItem('partner_ref');
              await api.post('/auth/resend-code', {
                ...formData,
                email,
                purpose: 'register',
                ref: ref || undefined,
              });
            } catch (err) {
              setError(formatAuthError(err));
            } finally {
              setLoading(false);
            }
          }}
        >
          Отправить код повторно
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Создайте кабинет" subtitle="Регистрация по коду на email">
      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      <form onSubmit={handleRegister} className="space-y-4">
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
        <Input
          label="Email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="you@salon.ru"
        />
        <label className="flex gap-3 cursor-pointer text-sm text-ink-secondary leading-snug">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
          />
          <span>
            Принимаю{' '}
            <Link to="/legal/offer" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              договор оферты
            </Link>{' '}
            и{' '}
            <Link to="/legal/payment" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              условия оплаты и возврата
            </Link>
          </span>
        </label>
        <PersonalDataConsentCheckbox checked={pdConsent} onChange={setPdConsent} variant="master" />
        <Button type="submit" className="w-full" size="lg" loading={loading} disabled={!termsAccepted || !pdConsent}>
          Получить код
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

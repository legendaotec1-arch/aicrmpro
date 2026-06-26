import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import partnerApi from '../../lib/partnerApi';
import { savePartnerToken } from '../../lib/partnerStorage';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PersonalDataConsentCheckbox from '../../components/legal/PersonalDataConsentCheckbox';

export default function PartnerRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form');
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pdConsent, setPdConsent] = useState(false);
  const [devCode, setDevCode] = useState('');

  const submitRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await partnerApi.post('/register', form);
      setEmail(form.email);
      setDevCode(res.data.devCode || '');
      setStep('verify');
    } catch (err) {
      setError(err?.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const submitVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await partnerApi.post('/verify-email', { email, code });
      savePartnerToken(res.data.token);
      navigate('/partner/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <AuthLayout variant="partner" title="Подтвердите email" subtitle={`Код отправлен на ${email}`}>
        {error && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}
        {devCode ? (
          <p className="mb-4 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-800">Dev-код: {devCode}</p>
        ) : null}
        <form onSubmit={submitVerify} className="space-y-4">
          <Input label="Код из письма" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Подтвердить и войти
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm text-primary hover:underline"
          onClick={async () => {
            await partnerApi.post('/resend-code', { email });
          }}
        >
          Отправить код повторно
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variant="partner" title="Партнёрская программа" subtitle="30% с оплат мастеров, которых вы привели">
      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      <form onSubmit={submitRegister} className="space-y-4">
        <Input label="ФИО" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Иванов Иван Иванович" />
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Телефон" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Необязательно" />
        <Input label="Пароль" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <label className="flex gap-3 text-sm text-ink-secondary">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required
            className="mt-1 h-4 w-4 rounded border-slate-300 text-primary"
          />
          <span>
            Принимаю{' '}
            <a href="/api/partner/offer/public" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
              условия партнёрской оферты
            </a>{' '}
            и подтверждаю, что самостоятельно уплачиваю налоги с вознаграждения
          </span>
        </label>
        <PersonalDataConsentCheckbox checked={pdConsent} onChange={setPdConsent} variant="partner" id="partner-pd-consent" />
        <Button type="submit" className="w-full" size="lg" loading={loading} disabled={!termsAccepted || !pdConsent}>
          Зарегистрироваться
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-secondary">
        Уже партнёр?{' '}
        <Link to="/partner/login" className="font-semibold text-primary hover:underline">
          Войти
        </Link>
      </p>
    </AuthLayout>
  );
}

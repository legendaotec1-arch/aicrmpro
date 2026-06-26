import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { formatAuthError } from '../lib/authStorage';

export default function MasterLogin() {
  const navigate = useNavigate();
  const { requestLoginCode, verifyEmailCode } = useContext(AuthContext);
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState('');

  const sendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await requestLoginCode(email);
      setEmail(res.email || email);
      setDevCode(res.devCode || '');
      setStep('verify');
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyEmailCode(email, code);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <AuthLayout title="Код из письма" subtitle={`Отправлен на ${email}`}>
        {error && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}
        {devCode ? (
          <p className="mb-4 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-800">Dev-код: {devCode}</p>
        ) : null}
        <form onSubmit={submitCode} className="space-y-4">
          <Input
            label="Код подтверждения"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
          />
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Войти в кабинет
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={async () => {
              setLoading(true);
              try {
                const res = await requestLoginCode(email);
                setDevCode(res.devCode || '');
              } catch (err) {
                setError(formatAuthError(err));
              } finally {
                setLoading(false);
              }
            }}
          >
            Отправить код повторно
          </button>
          <button type="button" className="text-ink-secondary hover:text-ink" onClick={() => setStep('email')}>
            Другой email
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="С возвращением" subtitle="Вход по коду на email">
      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
          {/не зарегистрирован/i.test(error) ? (
            <p className="mt-2">
              <Link to="/register" className="font-semibold text-primary hover:underline">
                Перейти к регистрации →
              </Link>
            </p>
          ) : null}
        </div>
      )}
      <form onSubmit={sendCode} className="space-y-4">
        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@salon.ru"
        />
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Получить код
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

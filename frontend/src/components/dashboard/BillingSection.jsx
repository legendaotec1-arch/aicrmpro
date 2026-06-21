import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  CalendarCheck,
  Crown,
  ExternalLink,
  Infinity,
  Lock,
  Receipt,
  Wallet
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import EmptyState from '../ui/EmptyState';
import { PageLoader } from '../ui/Spinner';

const TOPUP_PRESETS = [300, 500, 1000, 2000, 5000];

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function txMeta(type) {
  switch (type) {
    case 'topup':
      return { label: 'Пополнение', Icon: ArrowDownLeft, tone: 'bg-emerald-50 text-emerald-600' };
    case 'unlimited_purchase':
      return { label: 'Безлимит', Icon: Crown, tone: 'bg-violet-50 text-violet-600' };
    case 'booking_fee':
      return { label: 'Запись', Icon: CalendarCheck, tone: 'bg-slate-100 text-slate-600' };
    default:
      return { label: 'Операция', Icon: Receipt, tone: 'bg-slate-100 text-slate-600' };
  }
}

export default function BillingSection({ api, toast }) {
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [topupAmount, setTopupAmount] = useState('500');
  const [data, setData] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/master/me/billing');
      setData(res.data);
    } catch {
      toast('Не удалось загрузить раздел оплаты', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [api, toast]);

  const fee = data?.per_booking_fee ?? data?.perBookingFee ?? 20;
  const minTopup = data?.min_topup ?? data?.minTopup ?? 100;
  const unlimitedPrice = data?.unlimited_price ?? data?.unlimitedPrice ?? 900;
  const unlimitedDays = data?.unlimited_days ?? data?.unlimitedDays ?? 30;
  const criticalBalance = data?.criticalBalance ?? 30;

  const unlimitedActive = data?.unlimited_active;
  const bookingOk = data?.online_booking_allowed !== false;
  const balanceLow = !unlimitedActive && Number(data?.balance || 0) < Number(criticalBalance);
  const bookingsLeft = useMemo(
    () => Math.max(0, Math.floor(Number(data?.balance || 0) / fee)),
    [data?.balance, fee]
  );

  const startTopup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount < minTopup) {
      toast(`Минимум ${minTopup} ₽`, 'error');
      return;
    }
    setPaying(true);
    try {
      const res = await api.post('/master/me/billing/topup', { amount });
      if (res.data.confirmationUrl) window.location.href = res.data.confirmationUrl;
      else toast('Не получена ссылка на оплату', 'error');
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка оплаты', 'error');
    } finally {
      setPaying(false);
    }
  };

  const startUnlimited = async () => {
    setPaying(true);
    try {
      const res = await api.post('/master/me/billing/unlimited');
      if (res.data.confirmationUrl) window.location.href = res.data.confirmationUrl;
      else toast('Не получена ссылка на оплату', 'error');
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка оплаты', 'error');
    } finally {
      setPaying(false);
    }
  };

  const toggleAutoRenew = async () => {
    try {
      await api.put('/master/me/billing/auto-renew', { enabled: !data.tariff_auto_renew });
      toast('Сохранено');
      load();
    } catch {
      toast('Ошибка', 'error');
    }
  };

  if (loading) return <PageLoader />;

  const locked = data?.locked !== false && data?.enabled !== true;
  const payBlocked = data?.enabled === true && data?.yookassaConfigured !== true;

  return (
    <div className="relative mx-auto max-w-3xl space-y-4 animate-fade-in">
      <h1 className="text-xl font-bold text-admin-text sm:text-2xl">Оплата</h1>

      {payBlocked && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ЮKassa не подключена — пополнение временно недоступно.
        </p>
      )}

      {locked && (
        <div className="absolute inset-x-0 top-12 bottom-0 z-20 flex items-start justify-center rounded-2xl bg-admin-bg/70 p-4 backdrop-blur-sm">
          <div className="mt-4 w-full max-w-sm rounded-2xl border border-admin-border bg-white p-6 text-center shadow-xl">
            <Lock className="mx-auto h-8 w-8 text-amber-500" strokeWidth={1.75} />
            <p className="mt-3 font-semibold text-admin-text">Скоро откроется</p>
            <p className="mt-1 text-sm text-admin-textSecondary">Сейчас сервис бесплатный.</p>
          </div>
        </div>
      )}

      <div className={`space-y-4 ${locked ? 'pointer-events-none select-none opacity-40 blur-[1px]' : ''}`}>
        {/* Баланс + пополнение */}
        <section className="overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-[#6A5ACD] to-indigo-700 shadow-lg shadow-violet-200/30">
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-white/60">Баланс</p>
                <p className={`mt-0.5 text-4xl font-bold tabular-nums sm:text-5xl ${balanceLow ? 'text-amber-200' : 'text-white'}`}>
                  {formatMoney(data?.balance)}
                </p>
                <p className="mt-1.5 text-sm text-white/75">
                  {unlimitedActive
                    ? `Безлимит до ${formatDate(data?.tariff_expires_at)}`
                    : `~${bookingsLeft} записей · ${fee} ₽`}
                </p>
              </div>
              <span
                className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  bookingOk ? 'bg-white/15 text-white' : 'bg-red-500/30 text-red-50'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${bookingOk ? 'bg-emerald-300' : 'bg-red-200'}`} />
                {bookingOk ? 'Активно' : 'Нет средств'}
              </span>
            </div>

            {!bookingOk && data?.online_booking_block_reason && (
              <p className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-xs text-red-50">
                {data.online_booking_block_reason}
              </p>
            )}

            <div className="mt-4 rounded-xl bg-white p-4">
              <p className="text-sm font-semibold text-admin-text">Пополнить</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TOPUP_PRESETS.filter((n) => n >= minTopup).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTopupAmount(String(preset))}
                    className={`chip ${Number(topupAmount) === preset ? 'chip-active' : 'chip-inactive'}`}
                  >
                    {formatMoney(preset)}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Input
                    label={`от ${minTopup} ₽`}
                    type="number"
                    min={minTopup}
                    step="100"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                  />
                </div>
                <Button
                  onClick={startTopup}
                  loading={paying}
                  disabled={payBlocked}
                  className="w-full sm:w-auto sm:min-w-[140px]"
                  size="lg"
                >
                  <Wallet className="h-4 w-4" />
                  Оплатить
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Тарифы */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className={`rounded-2xl border bg-white p-4 ${
              !unlimitedActive ? 'border-admin-accent/40 ring-1 ring-admin-accent/20' : 'border-admin-border/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-admin-accent" />
              <span className="text-sm font-semibold text-admin-text">За запись</span>
              {!unlimitedActive && (
                <span className="ml-auto rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  сейчас
                </span>
              )}
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-admin-text">{fee} ₽</p>
            <p className="mt-0.5 text-xs text-admin-textMuted">за каждую запись</p>
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              unlimitedActive
                ? 'border-admin-accent/40 bg-gradient-to-br from-violet-50 to-white ring-1 ring-admin-accent/20'
                : 'border-admin-border/70 bg-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Infinity className="h-4 w-4 text-admin-accent" />
              <span className="text-sm font-semibold text-admin-text">Безлимит</span>
              {unlimitedActive && (
                <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  сейчас
                </span>
              )}
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-admin-text">{formatMoney(unlimitedPrice)}</p>
            <p className="mt-0.5 text-xs text-admin-textMuted">{unlimitedDays} дней</p>
            {unlimitedActive && (
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-admin-textSecondary">
                <input
                  type="checkbox"
                  checked={data?.tariff_auto_renew !== false}
                  onChange={toggleAutoRenew}
                  className="h-3.5 w-3.5 rounded border-admin-border text-admin-accent"
                />
                Автопродление
              </label>
            )}
            <Button
              variant={unlimitedActive ? 'secondary' : 'primary'}
              size="sm"
              onClick={startUnlimited}
              loading={paying}
              disabled={payBlocked}
              className="mt-3 w-full"
            >
              <Crown className="h-3.5 w-3.5" />
              {unlimitedActive ? 'Продлить' : 'Подключить'}
            </Button>
          </div>
        </div>

        {/* История */}
        <section className="overflow-hidden rounded-2xl border border-admin-border/70 bg-white">
          <div className="border-b border-admin-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-admin-text">История</h2>
          </div>

          {!data?.transactions?.length ? (
            <div className="p-5">
              <EmptyState icon="—" title="Пусто" description="Операций пока нет" />
            </div>
          ) : (
            <ul className="divide-y divide-admin-border/50">
              {data.transactions.map((tx) => {
                const { label, Icon, tone } = txMeta(tx.type);
                const positive = Number(tx.amount) >= 0;
                return (
                  <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-admin-text">{tx.description || label}</p>
                      <p className="text-[11px] text-admin-textMuted">{formatDateTime(tx.created_at)}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-bold tabular-nums ${positive ? 'text-emerald-600' : 'text-admin-text'}`}>
                      {positive ? '+' : ''}
                      {formatMoney(tx.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Link
          to="/legal/payment"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-admin-textMuted hover:text-admin-accent"
        >
          Оплата и возврат
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

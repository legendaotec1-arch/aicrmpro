import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  CalendarCheck,
  Check,
  Crown,
  ExternalLink,
  Infinity,
  Lock,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap
} from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
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
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
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
      return { label: 'Пополнение', Icon: ArrowDownLeft, tone: 'text-emerald-600 bg-emerald-50' };
    case 'unlimited_purchase':
      return { label: 'Безлимит', Icon: Crown, tone: 'text-violet-600 bg-violet-50' };
    case 'booking_fee':
      return { label: 'Запись', Icon: CalendarCheck, tone: 'text-slate-600 bg-slate-100' };
    default:
      return { label: 'Операция', Icon: Receipt, tone: 'text-slate-600 bg-slate-100' };
  }
}

function BalanceHero({ data, unlimitedActive, balanceLow, bookingsLeft }) {
  const bookingOk = data?.online_booking_allowed !== false;
  const fee = data?.per_booking_fee ?? data?.perBookingFee ?? 30;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft">
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200/90">Ваш баланс</p>
            <p
              className={`mt-2 font-display text-4xl font-black tracking-tight sm:text-5xl ${
                balanceLow ? 'text-rose-300' : 'text-white'
              }`}
            >
              {formatMoney(data?.balance)}
            </p>
            {!unlimitedActive && (
              <p className="mt-2 text-sm text-indigo-100/80">
                Хватит примерно на{' '}
                <span className="font-semibold text-white">{bookingsLeft}</span> онлайн-записей по {fee} ₽
              </p>
            )}
            {unlimitedActive && (
              <p className="mt-2 text-sm text-indigo-100/80">
                Тариф «Безлимит» активен до{' '}
                <span className="font-semibold text-white">{formatDate(data?.tariff_expires_at)}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            {unlimitedActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                <Infinity className="h-3.5 w-3.5" />
                Безлимит
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5" />
                {fee} ₽ за запись
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm ${
                bookingOk ? 'bg-emerald-400/20 text-emerald-100' : 'bg-rose-400/25 text-rose-100'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${bookingOk ? 'bg-emerald-300' : 'bg-rose-300'}`} />
              {bookingOk ? 'Ссылка для записи активна' : 'Запись приостановлена'}
            </span>
          </div>
        </div>

        {!unlimitedActive && !bookingOk && data?.online_booking_block_reason && (
          <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {data.online_booking_block_reason}
          </p>
        )}

        {!unlimitedActive && (
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-indigo-200/70">
              <span>Запас по балансу</span>
              <span>~{bookingsLeft} записей</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${
                  balanceLow ? 'bg-gradient-to-r from-rose-400 to-amber-400' : 'bg-gradient-to-r from-indigo-400 to-violet-300'
                }`}
                style={{
                  width: `${Math.min(100, Math.round((Number(data?.balance || 0) / Math.max((data?.warnBalance ?? 100), fee * 3)) * 100))}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4 sm:px-6">
          <p className="text-xs font-medium text-ink-muted">Тариф</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {unlimitedActive ? 'Безлимит · 30 дней' : `Оплата за запись · ${fee} ₽`}
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-xs font-medium text-ink-muted">Мин. пополнение</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {formatMoney(data?.min_topup ?? data?.minTopup ?? 100)}
          </p>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <p className="text-xs font-medium text-ink-muted">Оплата</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <ShieldCheck className="h-4 w-4 text-primary" />
            ЮKassa
          </p>
        </div>
      </div>
    </div>
  );
}

function TariffPlanCard({
  featured,
  badge,
  title,
  price,
  period,
  description,
  highlights,
  Icon,
  active,
  children
}) {
  return (
    <article
      className={`relative flex h-full flex-col rounded-[1.75rem] border p-6 sm:p-7 transition-shadow ${
        featured
          ? 'border-primary/35 bg-gradient-to-b from-violet-50/80 to-white shadow-lg shadow-primary/10 ring-1 ring-primary/15'
          : 'border-slate-200 bg-white shadow-card'
      } ${active ? 'ring-2 ring-primary/40' : ''}`}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1 text-xs font-bold text-white shadow-md">
          <Crown className="h-3.5 w-3.5" strokeWidth={2} />
          {badge}
        </span>
      )}
      {!featured && (
        <span className="mb-4 inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {badge}
        </span>
      )}
      {active && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <Check className="h-3 w-3" strokeWidth={3} />
          Активен
        </span>
      )}

      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            featured
              ? 'bg-gradient-to-br from-violet-600 to-indigo-500 text-white shadow-lg shadow-primary/25'
              : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 pr-16">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <p className="mt-2">
            <span className="font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">{price}</span>
          </p>
          <p className="mt-1 text-sm text-ink-secondary">{period}</p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-ink-secondary">{description}</p>

      <ul className="mt-5 flex-1 space-y-2.5">
        {highlights.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-ink">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-6 pt-2">{children}</div>
    </article>
  );
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

  const perBookingFee = data?.per_booking_fee ?? data?.perBookingFee ?? 30;
  const minTopup = data?.min_topup ?? data?.minTopup ?? 100;
  const unlimitedPrice = data?.unlimited_price ?? data?.unlimitedPrice ?? 1500;
  const unlimitedDays = data?.unlimited_days ?? data?.unlimitedDays ?? 30;
  const criticalBalance = data?.criticalBalance ?? 30;

  const unlimitedActive = data?.unlimited_active;
  const balanceLow = !unlimitedActive && Number(data?.balance || 0) < Number(criticalBalance);
  const bookingsLeft = useMemo(
    () => Math.max(0, Math.floor(Number(data?.balance || 0) / perBookingFee)),
    [data?.balance, perBookingFee]
  );

  const startTopup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount < minTopup) {
      toast(`Минимальное пополнение — ${minTopup} ₽`, 'error');
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
      toast('Настройка сохранена');
      load();
    } catch {
      toast('Ошибка сохранения', 'error');
    }
  };

  if (loading) return <PageLoader />;

  const locked = data?.locked !== false;

  return (
    <div className="relative space-y-8 animate-fade-in">
      <header className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Прозрачная оплата
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink sm:text-3xl">Оплата и тариф</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary sm:text-base">
          Управляйте балансом, выбирайте тариф и следите за списаниями. Записи, добавленные вручную в кабинете, не
          тарифицируются.
        </p>
      </header>

      {locked && (
        <div
          className="absolute inset-x-0 top-24 bottom-0 z-20 flex items-start justify-center rounded-3xl bg-slate-50/75 p-4 backdrop-blur-md sm:p-8"
          aria-hidden={false}
        >
          <div className="mx-auto mt-4 w-full max-w-md rounded-3xl border border-white bg-white p-8 text-center shadow-xl shadow-slate-200/60 sm:mt-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 text-amber-600">
              <Lock className="h-8 w-8" strokeWidth={1.75} />
            </div>
            <h3 className="font-display text-xl font-bold text-ink">Раздел скоро откроется</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
              Сейчас сервис бесплатный: ваша ссылка для клиентов работает без ограничений. Ниже — превью того, как будет
              выглядеть оплата после включения тарифов.
            </p>
          </div>
        </div>
      )}

      <div className={`space-y-8 ${locked ? 'pointer-events-none select-none opacity-[0.45] blur-[1px]' : ''}`}>
        <BalanceHero
          data={data}
          unlimitedActive={unlimitedActive}
          balanceLow={balanceLow}
          bookingsLeft={bookingsLeft}
        />

        <section>
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Выберите тариф</h2>
              <p className="text-sm text-ink-secondary">Можно переключаться в любой момент</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
            <TariffPlanCard
              badge="Гибкий старт"
              title="За запись"
              price={`${perBookingFee} ₽`}
              period="списание только за онлайн-запись клиента"
              description="Платите по факту: нет записей через ссылку — списаний нет. Удобно на старте и при небольшом потоке."
              highlights={[
                'Абонентская плата — 0 ₽',
                'Ручные записи в кабинете — бесплатно',
                'Ссылка снова активна сразу после пополнения'
              ]}
              Icon={Wallet}
              active={!unlimitedActive}
            >
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-ink-muted">Быстрое пополнение</p>
                  <div className="flex flex-wrap gap-2">
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
                </div>
                <Input
                  label={`Сумма пополнения (от ${minTopup} ₽)`}
                  type="number"
                  min={minTopup}
                  step="100"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                />
                <Button onClick={startTopup} loading={paying} className="w-full" size="lg">
                  <Wallet className="h-4 w-4" />
                  Пополнить баланс
                </Button>
              </div>
            </TariffPlanCard>

            <TariffPlanCard
              featured
              badge="Выгодно от ~50 записей"
              title="Безлимит"
              price={formatMoney(unlimitedPrice)}
              period={`на ${unlimitedDays} дней · записей без лимита`}
              description="Один платёж — любое число онлайн-записей. Списание за каждую запись не производится."
              highlights={[
                'Неограниченные онлайн-записи',
                'Все функции кабинета включены',
                'Автопродление можно отключить'
              ]}
              Icon={Infinity}
              active={unlimitedActive}
            >
              <div className="space-y-4">
                {unlimitedActive && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={data?.tariff_auto_renew !== false}
                      onChange={toggleAutoRenew}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                    />
                    <span>
                      <span className="font-medium">Автопродление</span>
                      <span className="mt-0.5 block text-xs text-ink-secondary">
                        {formatMoney(unlimitedPrice)} каждые {unlimitedDays} дней
                      </span>
                    </span>
                  </label>
                )}
                <Button
                  variant={unlimitedActive ? 'secondary' : 'primary'}
                  onClick={startUnlimited}
                  loading={paying}
                  className="w-full"
                  size="lg"
                >
                  {unlimitedActive ? 'Продлить безлимит' : 'Подключить безлимит'}
                </Button>
              </div>
            </TariffPlanCard>
          </div>
        </section>

        <Card className="!p-0 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <CardHeader title="История операций" description="Пополнения и списания за онлайн-записи" />
          </div>

          {!data?.transactions?.length ? (
            <EmptyState
              icon={<Receipt className="h-7 w-7 text-primary" strokeWidth={1.75} />}
              title="Пока нет операций"
              description="Здесь появятся пополнения баланса и списания за записи клиентов через вашу ссылку."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.transactions.map((tx) => {
                const { label, Icon, tone } = txMeta(tx.type);
                const positive = Number(tx.amount) >= 0;
                return (
                  <li
                    key={tx.id}
                    className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50/80 sm:px-6"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{tx.description || label}</p>
                      <p className="text-xs text-ink-muted">{formatDateTime(tx.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold tabular-nums ${
                          positive ? 'text-emerald-600' : 'text-ink'
                        }`}
                      >
                        {positive ? '+' : ''}
                        {formatMoney(tx.amount)}
                      </p>
                      {tx.balance_after != null && (
                        <p className="text-xs text-ink-muted">баланс {formatMoney(tx.balance_after)}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <footer className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-ink-secondary">
            Оплата обрабатывается через ЮKassa. Условия возврата и оплаты — в документе на сайте.
          </p>
          <Link
            to="/legal/payment"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover"
          >
            Оплата и возврат
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </footer>
      </div>
    </div>
  );
}

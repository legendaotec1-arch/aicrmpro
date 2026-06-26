import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, TrendingUp, Wallet, PiggyBank, MinusCircle } from 'lucide-react';
import adminApi from '../../lib/adminApi';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { formatRub, formatDate } from './adminFormat';

const EARNED_PERIODS = [
  { id: 'today', label: 'Сегодня', field: 'earnedTodayRub', hint: 'С 00:00 по Москве' },
  { id: '7d', label: '7 дней', field: 'earned7dRub', hint: 'За последние 7 суток' },
  { id: '30d', label: '30 дней', field: 'earned30dRub', hint: 'За последние 30 суток' },
];

function MoneyCard({ icon: Icon, label, value, hint, accent, children }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${accent || 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {children ? <div className="mb-2">{children}</div> : null}
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <div className="shrink-0 rounded-xl bg-violet-50 p-2.5 text-violet-600">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function PeriodToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {EARNED_PERIODS.map((period) => (
        <button
          key={period.id}
          type="button"
          onClick={() => onChange(period.id)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            value === period.id
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

export default function AdminFinanceTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [earnedPeriod, setEarnedPeriod] = useState('today');
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await adminApi.get('/finance/summary');
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Не удалось загрузить финансы');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const earnedPeriodMeta = useMemo(
    () => EARNED_PERIODS.find((p) => p.id === earnedPeriod) || EARNED_PERIODS[0],
    [earnedPeriod]
  );

  const earnedForPeriod = data ? Number(data[earnedPeriodMeta.field] ?? 0) : 0;

  const submitWithdrawal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.post('/finance/withdrawals', {
        amount: Number(amount),
        reason: reason.trim(),
      });
      setAmount('');
      setReason('');
      setShowForm(false);
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось записать списание');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Загрузка финансов…</p>;

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MoneyCard
              icon={TrendingUp}
              label="Заработали"
              value={formatRub(earnedForPeriod)}
              hint={`${earnedPeriodMeta.hint} · успешные оплаты ЮKassa`}
              accent="border-emerald-200"
            >
              <PeriodToggle value={earnedPeriod} onChange={setEarnedPeriod} />
            </MoneyCard>

            <MoneyCard
              icon={PiggyBank}
              label="На счёте"
              value={formatRub(data.balanceRub)}
              hint="Поступления с оплат минус списания со счёта"
              accent="border-violet-300 ring-1 ring-violet-100"
            />

            <MoneyCard
              icon={Wallet}
              label="Заработано всего"
              value={formatRub(data.earnedTotalRub)}
              hint="Все успешные оплаты за всё время проекта"
            />

            <MoneyCard
              icon={MinusCircle}
              label="Списано всего"
              value={formatRub(data.withdrawnRub)}
              hint="Все выводы и расходы со счёта платформы"
              accent="border-amber-200"
            />
          </section>

          <div className="flex justify-end">
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              <ArrowDownCircle size={16} className="mr-1.5" />
              Списать со счёта
            </Button>
          </div>

          {showForm ? (
            <form onSubmit={submitWithdrawal} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm space-y-3 max-w-lg">
              <h3 className="font-bold text-slate-900">Списание со счёта</h3>
              <p className="text-sm text-slate-500">Доступно на счёте: {formatRub(data.balanceRub)}</p>
              <Input
                label="Сумма, ₽"
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">За что списание</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                  required
                  placeholder="Например: вывод на карту, оплата сервера…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button type="submit" loading={saving}>Записать списание</Button>
            </form>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">История списаний</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Дата</th>
                    <th className="px-5 py-3 font-medium">Сумма</th>
                    <th className="px-5 py-3 font-medium">Причина</th>
                    <th className="px-5 py-3 font-medium">Кто</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.withdrawals || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-slate-400">Списаний пока нет</td>
                    </tr>
                  ) : (
                    data.withdrawals.map((row) => (
                      <tr key={row.id}>
                        <td className="px-5 py-3 text-slate-600">{formatDate(row.created_at)}</td>
                        <td className="px-5 py-3 font-semibold text-rose-700">−{formatRub(row.amount)}</td>
                        <td className="px-5 py-3 text-slate-700">{row.reason}</td>
                        <td className="px-5 py-3 text-slate-500">{row.created_by_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

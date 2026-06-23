import { useCallback, useEffect, useState } from 'react';
import { ArrowDownCircle, TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import adminApi from '../../lib/adminApi';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { formatRub, formatDate } from './adminFormat';

function MoneyCard({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${accent || 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function AdminFinanceTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
            <MoneyCard icon={TrendingUp} label="Заработали сегодня" value={formatRub(data.earnedTodayRub)} hint="Успешные оплаты ЮKassa" accent="border-emerald-200" />
            <MoneyCard icon={Wallet} label="Заработали всего" value={formatRub(data.earnedTotalRub)} hint="Все поступления на платформу" />
            <MoneyCard icon={ArrowDownCircle} label="Списано" value={formatRub(data.withdrawnRub)} hint="Выводы со счёта" accent="border-amber-200" />
            <MoneyCard icon={PiggyBank} label="На счёте" value={formatRub(data.balanceRub)} hint="Всего − списания" accent="border-violet-200" />
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
              <p className="text-sm text-slate-500">Доступно: {formatRub(data.balanceRub)}</p>
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

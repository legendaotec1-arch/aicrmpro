import { useEffect, useState } from 'react';
import Card, { CardHeader } from '../ui/Card';
import { StatCard } from '../layout/DashboardLayout';
import { PageLoader } from '../ui/Spinner';
import { formatPrice } from '../../lib/format';

export default function AnalyticsSection({ api, toast }) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/master/me/analytics?days=${days}`);
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) toast('Не удалось загрузить аналитику', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, days, toast]);

  if (loading) return <PageLoader />;

  if (!data) {
    return <p className="text-sm text-slate-500 text-center py-12">Нет данных</p>;
  }

  const { summary, daily, top_services, by_master } = data;
  const chartValues = daily.map((d) => d.appointments);
  const maxChart = Math.max(...chartValues, 1);
  const showDaily = daily.length <= 14 ? daily : daily.filter((_, i) => i % Math.ceil(daily.length / 14) === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`chip ${days === d ? 'chip-active' : 'chip-inactive'}`}
          >
            {d} дней
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Записей" value={summary.appointments} hint={`за ${days} дн.`} />
        <StatCard label="Выручка" value={formatPrice(summary.revenue)} accent="text-accent" />
        <StatCard label="Клиентов" value={summary.unique_clients} hint={`новых: ${summary.new_clients}`} />
        <StatCard label="Отмены" value={`${summary.cancellation_rate}%`} hint={`${summary.cancelled} отмен`} />
      </div>

      <Card>
        <CardHeader title="Записи по дням" />
        <div className="flex items-end gap-1 h-36 pt-2 overflow-x-auto">
          {showDaily.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1 min-w-[20px] flex-1">
              <div
                className="w-full max-w-[28px] rounded-t-md bg-accent/80 min-h-[4px]"
                style={{ height: `${(d.appointments / maxChart) * 100}%` }}
                title={`${d.date}: ${d.appointments}`}
              />
              <span className="text-[9px] text-slate-500 rotate-0">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Топ услуг" />
          {top_services.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">Нет данных</p>
          ) : (
            <ul className="space-y-2">
              {top_services.map((s) => (
                <li key={s.name} className="flex justify-between items-center rounded-xl px-3 py-2 bg-admin-surface">
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.count} записей</p>
                  </div>
                  <p className="font-semibold text-accent">{formatPrice(s.revenue)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="По мастерам" />
          {by_master.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">Нет данных</p>
          ) : (
            <ul className="space-y-2">
              {by_master.map((m) => (
                <li key={m.name} className="flex justify-between items-center rounded-xl px-3 py-2 bg-admin-surface">
                  <div>
                    <p className="text-sm font-medium text-white">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.appointments} записей</p>
                  </div>
                  <p className="font-semibold text-accent">{formatPrice(m.revenue)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

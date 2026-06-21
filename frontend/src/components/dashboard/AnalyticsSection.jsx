import { useEffect, useState } from 'react';
import Card, { CardHeader } from '../ui/Card';
import { StatCard } from '../layout/DashboardLayout';
import { PageLoader } from '../ui/Spinner';
import { formatPrice } from '../../lib/format';

const CHART_HEIGHT = 120;

function formatChartDay(dateStr) {
  if (!dateStr) return '';
  return `${dateStr.slice(8, 10)}.${dateStr.slice(5, 7)}`;
}

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
    return <p className="text-sm text-admin-textMuted text-center py-12">Нет данных</p>;
  }

  const { summary, daily, top_services, by_master } = data;
  const chartValues = daily.map((d) => d.appointments);
  const maxChart = Math.max(...chartValues, 1);
  const showDaily = daily.length <= 14 ? daily : daily.filter((_, i) => i % Math.ceil(daily.length / 14) === 0);
  const hasChartData = chartValues.some((v) => v > 0);

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
        <StatCard label="Выручка" value={formatPrice(summary.revenue)} accent="text-admin-accent" />
        <StatCard label="Клиентов" value={summary.unique_clients} hint={`новых: ${summary.new_clients}`} />
        <StatCard label="Отмены" value={`${summary.cancellation_rate}%`} hint={`${summary.cancelled} отмен`} />
      </div>

      <Card>
        <CardHeader title="Записи по дням" description="Подтверждённые и завершённые визиты" />
        {!hasChartData ? (
          <p className="py-10 text-center text-sm text-admin-textMuted">За выбранный период записей нет</p>
        ) : (
          <div className="flex items-end gap-1.5 overflow-x-auto px-1 pb-1" style={{ height: CHART_HEIGHT + 44 }}>
            {showDaily.map((d) => {
              const barHeight =
                d.appointments > 0
                  ? Math.max(10, Math.round((d.appointments / maxChart) * CHART_HEIGHT))
                  : 4;
              return (
                <div
                  key={d.date}
                  className="flex min-w-[28px] flex-1 flex-col items-center justify-end gap-1"
                  style={{ height: CHART_HEIGHT + 36 }}
                >
                  <span className="text-[10px] font-semibold tabular-nums text-admin-textMuted leading-none min-h-[14px]">
                    {d.appointments > 0 ? d.appointments : ''}
                  </span>
                  <div
                    className={`w-full max-w-[32px] rounded-t-md transition-all ${
                      d.appointments > 0 ? 'bg-admin-accent' : 'bg-admin-border'
                    }`}
                    style={{ height: `${barHeight}px` }}
                    title={`${formatChartDay(d.date)}: ${d.appointments} записей`}
                  />
                  <span className="text-[10px] tabular-nums text-admin-textMuted whitespace-nowrap">
                    {formatChartDay(d.date)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Топ услуг" />
          {top_services.length === 0 ? (
            <p className="text-sm text-admin-textMuted py-4">Нет данных</p>
          ) : (
            <ul className="space-y-2">
              {top_services.map((s) => (
                <li
                  key={s.name}
                  className="flex justify-between items-center rounded-xl px-3 py-2 bg-admin-bg border border-admin-border"
                >
                  <div>
                    <p className="text-sm font-medium text-admin-text">{s.name}</p>
                    <p className="text-xs text-admin-textMuted">{s.count} записей</p>
                  </div>
                  <p className="font-semibold text-admin-accent">{formatPrice(s.revenue)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="По мастерам" />
          {by_master.length === 0 ? (
            <p className="text-sm text-admin-textMuted py-4">Нет данных</p>
          ) : (
            <ul className="space-y-2">
              {by_master.map((m) => (
                <li
                  key={m.name}
                  className="flex justify-between items-center rounded-xl px-3 py-2 bg-admin-bg border border-admin-border"
                >
                  <div>
                    <p className="text-sm font-medium text-admin-text">{m.name}</p>
                    <p className="text-xs text-admin-textMuted">{m.appointments} записей</p>
                  </div>
                  <p className="font-semibold text-admin-accent">{formatPrice(m.revenue)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

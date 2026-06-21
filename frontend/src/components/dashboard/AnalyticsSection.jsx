import { useEffect, useState } from 'react';
import Card, { CardHeader } from '../ui/Card';
import { StatCard } from '../layout/DashboardLayout';
import { PageLoader } from '../ui/Spinner';
import { formatPrice } from '../../lib/format';

const CHART_HEIGHT = 140;

function formatChartDay(dateStr) {
  if (!dateStr) return '';
  return `${dateStr.slice(8, 10)}.${dateStr.slice(5, 7)}`;
}

/** Все дни периода — без прореживания, чтобы не терять дни с записями */

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
  const chartValues = daily.map((d) => d.appointments ?? 0);
  const maxChart = Math.max(...chartValues, 1);
  const showDaily = daily;
  const hasChartData = chartValues.some((v) => v > 0);
  const chartTotal = chartValues.reduce((s, v) => s + v, 0);
  const chartActive = daily.reduce((s, d) => s + (d.active ?? 0), 0);
  const chartCompleted = daily.reduce((s, d) => s + (d.completed ?? 0), 0);
  const chartNegative = daily.reduce((s, d) => s + (d.negative ?? 0), 0);

  function dayBarHeights(d) {
    const total = d.appointments ?? 0;
    if (total <= 0) return { total: 3, completed: 0, confirmed: 0, negative: 0 };
    const barTotal = Math.max(16, Math.round((total / maxChart) * CHART_HEIGHT));
    const completed = d.completed ?? 0;
    const confirmed = d.confirmed ?? 0;
    const negative = d.negative ?? 0;
    const completedH = Math.round((completed / total) * barTotal);
    const confirmedH = Math.round((confirmed / total) * barTotal);
    const negativeH = Math.max(0, barTotal - completedH - confirmedH);
    return { total: barTotal, completed: completedH, confirmed: confirmedH, negative: negativeH };
  }

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
        <CardHeader
          title="Записи по дням"
          description="Фиолетовый — завершённые. Светлый — подтверждённые. Красный — отмены и «не пришёл»."
        />
        {!hasChartData ? (
          <div className="py-10 text-center">
            <p className="text-sm text-admin-textMuted">За {days} дней записей нет</p>
            <p className="mt-1 text-xs text-admin-textMuted">Появятся после создания записей в кабинете или по ссылке</p>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-admin-textMuted">
              <span>
                Всего: <span className="font-semibold text-admin-text">{chartTotal}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-violet-600 to-admin-accent" />
                Завершено: <span className="font-semibold text-admin-accent">{chartCompleted}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-violet-200" />
                Подтверждено: <span className="font-semibold text-violet-600">{chartActive - chartCompleted}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                Отмены: <span className="font-semibold text-red-600">{chartNegative}</span>
              </span>
            </div>
            <div
              className="flex items-end gap-1 overflow-x-auto border-b border-admin-border/60 px-1 pb-2"
              style={{ height: CHART_HEIGHT + 52 }}
            >
              {showDaily.map((d) => {
                const { total, completed, confirmed, negative } = dayBarHeights(d);
                const count = d.appointments ?? 0;
                return (
                  <div
                    key={d.date}
                    className="flex w-8 shrink-0 flex-col items-center justify-end gap-1 sm:w-9"
                    style={{ height: CHART_HEIGHT + 40 }}
                    title={`${formatChartDay(d.date)}: ${count} (завершено ${d.completed ?? 0}, подтверждено ${d.confirmed ?? 0}, отмен ${d.negative ?? 0})`}
                  >
                    <span
                      className={`text-[10px] font-bold tabular-nums leading-none ${
                        count > 0 ? 'text-admin-text' : 'text-transparent'
                      }`}
                    >
                      {count || '·'}
                    </span>
                    <div
                      className="flex w-full flex-col justify-end overflow-hidden rounded-t-md"
                      style={{ height: `${total}px` }}
                    >
                      {negative > 0 && (
                        <div
                          className="w-full bg-gradient-to-t from-red-600 to-red-400"
                          style={{ height: `${negative}px` }}
                        />
                      )}
                      {confirmed > 0 && (
                        <div
                          className="w-full bg-gradient-to-t from-violet-300 to-violet-200"
                          style={{ height: `${confirmed}px` }}
                        />
                      )}
                      {completed > 0 && (
                        <div
                          className="w-full bg-gradient-to-t from-violet-600 to-admin-accent shadow-sm shadow-violet-200/40"
                          style={{ height: `${completed}px` }}
                        />
                      )}
                      {count <= 0 && <div className="h-full w-full bg-admin-border/80" />}
                    </div>
                    <span className="text-[9px] tabular-nums text-admin-textMuted">{formatChartDay(d.date)}</span>
                  </div>
                );
              })}
            </div>
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

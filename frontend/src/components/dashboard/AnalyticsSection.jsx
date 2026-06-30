import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarCheck,
  Download,
  FileSpreadsheet,
  PiggyBank,
  TrendingUp,
  Users,
  Wallet
} from 'lucide-react';
import Button from '../ui/Button';
import { PageLoader } from '../ui/Spinner';
import SalonMasterAvatar from '../client/SalonMasterAvatar';
import { formatPrice } from '../../lib/format';

const CHART_HEIGHT = 120;

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthOptions() {
  const items = [];
  const now = new Date();
  for (let i = 0; i < 13; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const short = d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
    const label =
      i === 0
        ? 'Сейчас'
        : d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    items.push({
      value,
      short: i === 0 ? 'Сейчас' : `${short} ${String(d.getFullYear()).slice(2)}`,
      label: label.charAt(0).toUpperCase() + label.slice(1)
    });
  }
  return items;
}

function formatChartDay(dateStr) {
  if (!dateStr) return '';
  return `${dateStr.slice(8, 10)}.${dateStr.slice(5, 7)}`;
}

function MetricCell({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    violet: 'bg-violet-100 text-violet-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600'
  };

  return (
    <div className="px-3 py-3.5 text-center sm:px-4 sm:py-4">
      <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-admin-textMuted">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums text-admin-text sm:text-lg">{value}</p>
    </div>
  );
}

function LeaderCard({ label, master }) {
  if (!master) return null;
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-[1.1rem] bg-amber-50/90 px-3 py-2.5 ring-1 ring-amber-200/80">
      <SalonMasterAvatar
        master={master}
        size={40}
        radius={9999}
        className="ring-2 ring-white"
        fallbackStyle={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', color: '#fff' }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70">{label}</p>
        <p className="truncate text-sm font-bold text-amber-950">{master.name}</p>
        <p className="text-xs font-bold tabular-nums text-emerald-700">{formatPrice(master.master_share)}</p>
      </div>
    </div>
  );
}

function MasterPayoutCard({ master, onExport, exporting }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.1rem] bg-white p-3 ring-1 ring-slate-200/80">
      <SalonMasterAvatar
        master={master}
        size={48}
        radius={9999}
        className="ring-2 ring-slate-100"
        fallbackStyle={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6A5ACD 100%)', color: '#fff' }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-admin-text">{master.name}</p>
        <p className="text-xs text-admin-textMuted">
          {master.commission_percent}% · {master.appointments} записей
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">{formatPrice(master.master_share)}</p>
      </div>
      {master.salon_master_id ? (
        <button
          type="button"
          title="Excel за месяц"
          disabled={exporting}
          onClick={() => onExport(master.salon_master_id)}
          className="shrink-0 rounded-xl p-2 text-[#217346] transition hover:bg-green-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function SectionShell({ title, description, children, action }) {
  return (
    <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div>
          <h2 className="text-base font-bold text-admin-text">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-admin-textMuted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function AnalyticsSection({ api, toast }) {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [month, setMonth] = useState(currentMonthKey);
  const [data, setData] = useState(null);
  const months = useMemo(() => monthOptions(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/master/me/analytics?month=${encodeURIComponent(month)}`);
      setData(res.data);
    } catch {
      toast('Не удалось загрузить аналитику', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, month, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadExport = async (masterId = null) => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ month });
      if (masterId) params.set('master_id', masterId);
      const res = await api.get(`/master/me/analytics-export?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = masterId ? `analitika-master-${month}.xlsx` : `analitika-salon-${month}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Отчёт скачан', 'success');
    } catch {
      toast('Не удалось выгрузить отчёт', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <PageLoader />
      </div>
    );
  }

  if (!data) {
    return <p className="py-12 text-center text-sm text-admin-textMuted">Нет данных</p>;
  }

  const {
    summary,
    daily,
    top_services,
    by_master,
    master_payouts,
    payouts,
    leaders,
    month_label,
    is_current_month
  } = data;

  const chartValues = daily.map((d) => d.appointments ?? 0);
  const maxChart = Math.max(...chartValues, 1);
  const hasChartData = chartValues.some((v) => v > 0);
  const chartTotal = chartValues.reduce((s, v) => s + v, 0);
  const chartCompleted = daily.reduce((s, d) => s + (d.completed ?? 0), 0);
  const chartActive = daily.reduce((s, d) => s + (d.active ?? 0), 0);
  const chartNegative = daily.reduce((s, d) => s + (d.negative ?? 0), 0);
  const maxAppointments = Math.max(...by_master.map((m) => m.appointments), 1);

  function dayBarHeights(d) {
    const total = d.appointments ?? 0;
    if (total <= 0) return { total: 3, completed: 0, confirmed: 0, negative: 0 };
    const barTotal = Math.max(12, Math.round((total / maxChart) * CHART_HEIGHT));
    const completed = d.completed ?? 0;
    const confirmed = d.confirmed ?? 0;
    const completedH = Math.round((completed / total) * barTotal);
    const confirmedH = Math.round((confirmed / total) * barTotal);
    const negativeH = Math.max(0, barTotal - completedH - confirmedH);
    return { total: barTotal, completed: completedH, confirmed: confirmedH, negative: negativeH };
  }

  const monthLabel = months.find((m) => m.value === month)?.label || month_label;

  return (
    <div className="overview-shell -mx-1 space-y-4 rounded-[1.75rem] px-1 pb-2">
      <section className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#5B4FCF] via-[#6A5ACD] to-[#4338CA] px-4 py-5 text-white shadow-xl shadow-violet-500/20 sm:px-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Аналитика</p>
            <h1 className="mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl">
              {formatPrice(summary.revenue)}
            </h1>
            <p className="mt-1 text-sm text-white/75">{monthLabel} · завершённые записи</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">Мастерам</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{formatPrice(summary.masters_share)}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">Салону</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{formatPrice(summary.salon_share)}</p>
          </div>
        </div>

        <div className="relative mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/60">Период с 1-го числа</p>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
            {months.map((m) => {
              const active = m.value === month;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMonth(m.value)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'bg-white/10 text-white/85 ring-1 ring-white/15 hover:bg-white/20'
                  }`}
                >
                  {m.short}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mt-4">
          <Button
            size="sm"
            onClick={() => downloadExport()}
            loading={exporting}
            className="w-full !bg-white !text-[#217346] hover:!bg-green-50 sm:w-auto"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel за месяц
          </Button>
          {!is_current_month ? (
            <p className="mt-2 text-[11px] text-white/65">Архивный месяц — данные зафиксированы</p>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70">
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          <MetricCell icon={Wallet} label="Записей" value={summary.appointments} tone="violet" />
          <MetricCell icon={Users} label="Клиентов" value={summary.unique_clients} tone="emerald" />
          <MetricCell icon={TrendingUp} label="Отмены" value={`${summary.cancellation_rate}%`} tone="amber" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <MetricCell icon={CalendarCheck} label="Завершено" value={summary.completed} />
          <MetricCell icon={Users} label="Новых" value={summary.new_clients} tone="emerald" />
          <MetricCell icon={PiggyBank} label="Отменено" value={summary.cancelled} tone="amber" />
        </div>
      </section>

      {summary.confirmed_pending > 0 ? (
        <div className="rounded-[1.1rem] bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-200/80">
          <span className="font-semibold">Ожидается: </span>
          {formatPrice(summary.expected_revenue)} выручки, {formatPrice(summary.expected_masters_share)} мастерам —{' '}
          {summary.confirmed_pending} подтверждённых записей.
        </div>
      ) : null}

      {is_current_month && payouts.today ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.1rem] bg-emerald-50/80 p-4 ring-1 ring-emerald-200/70">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70">Сегодня</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800">
              {formatPrice(payouts.today.masters_share)}
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              к выплате · {payouts.today.appointments} записей · выручка {formatPrice(payouts.today.gross)}
            </p>
          </div>
          <div className="rounded-[1.1rem] bg-violet-50/80 p-4 ring-1 ring-violet-200/70">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800/70">
              Месяц · {month_label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-violet-900">
              {formatPrice(payouts.month.masters_share)}
            </p>
            <p className="mt-1 text-xs text-violet-700/80">
              к выплате · {payouts.month.appointments} записей · салону {formatPrice(payouts.month.salon_share)}
            </p>
          </div>
        </div>
      ) : null}

      {(leaders?.by_appointments || leaders?.by_clients || leaders?.by_revenue) && (
        <div className="grid gap-2 sm:grid-cols-3">
          <LeaderCard label="Больше записей" master={leaders.by_appointments} />
          <LeaderCard label="Больше клиентов" master={leaders.by_clients} />
          <LeaderCard label="Больше выручки" master={leaders.by_revenue} />
        </div>
      )}

      {master_payouts?.length > 0 ? (
        <SectionShell title="Выплаты мастерам" description={`За ${monthLabel.toLowerCase()}`}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {master_payouts.map((m) => (
              <MasterPayoutCard
                key={m.salon_master_id || m.name}
                master={m}
                onExport={downloadExport}
                exporting={exporting}
              />
            ))}
          </div>
        </SectionShell>
      ) : null}

      <SectionShell
        title="Мастера"
        description="% из раздела «Мастера» · месяц с 1-го числа"
      >
        {by_master.length === 0 ? (
          <p className="py-6 text-center text-sm text-admin-textMuted">Нет записей за выбранный месяц</p>
        ) : (
          <>
            <div className="space-y-2 lg:hidden">
              {by_master.map((m) => (
                <div
                  key={m.salon_master_id || m.name}
                  className="rounded-[1.05rem] bg-slate-50 p-3 ring-1 ring-slate-200/70"
                >
                  <div className="flex items-center gap-2.5">
                    <SalonMasterAvatar
                      master={m}
                      size={40}
                      radius={9999}
                      fallbackStyle={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6A5ACD 100%)',
                        color: '#fff',
                        fontSize: 13
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-admin-text">{m.name}</p>
                      <p className="text-xs text-admin-textMuted">
                        {m.appointments} зап. · {m.unique_clients} клиентов · {m.commission_percent}%
                      </p>
                    </div>
                    {m.salon_master_id ? (
                      <button
                        type="button"
                        disabled={exporting}
                        onClick={() => downloadExport(m.salon_master_id)}
                        className="rounded-lg p-1.5 text-[#217346] hover:bg-green-50 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-admin-textMuted">Выручка</p>
                      <p className="font-bold tabular-nums">{formatPrice(m.gross_revenue)}</p>
                    </div>
                    <div>
                      <p className="text-admin-textMuted">К выплате</p>
                      <p className="font-bold tabular-nums text-emerald-700">{formatPrice(m.master_share)}</p>
                    </div>
                    <div>
                      <p className="text-admin-textMuted">Салону</p>
                      <p className="font-bold tabular-nums text-violet-700">{formatPrice(m.salon_share)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="-mx-1 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10px] font-semibold uppercase tracking-wide text-admin-textMuted">
                    <th className="px-3 py-2">Мастер</th>
                    <th className="px-3 py-2 text-right">Записей</th>
                    <th className="px-3 py-2 text-right">Клиентов</th>
                    <th className="px-3 py-2 text-right">%</th>
                    <th className="px-3 py-2 text-right">Выручка</th>
                    <th className="px-3 py-2 text-right">К выплате</th>
                    <th className="px-3 py-2 text-right">Салону</th>
                    {is_current_month ? <th className="px-3 py-2 text-right">Сегодня</th> : null}
                    <th className="w-10 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {by_master.map((m) => {
                    const barPct = Math.round((m.appointments / maxAppointments) * 100);
                    return (
                      <tr key={m.salon_master_id || m.name} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <SalonMasterAvatar
                              master={m}
                              size={32}
                              radius={9999}
                              fallbackStyle={{
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #6A5ACD 100%)',
                                color: '#fff',
                                fontSize: 12
                              }}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{m.name}</p>
                              <div className="mt-1 h-1 w-16 rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-admin-accent"
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{m.appointments}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{m.unique_clients}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-admin-textMuted">
                          {m.commission_percent}%
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(m.gross_revenue)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-emerald-700">
                          {formatPrice(m.master_share)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-violet-700">
                          {formatPrice(m.salon_share)}
                        </td>
                        {is_current_month ? (
                          <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">
                            {formatPrice(m.master_share_today)}
                          </td>
                        ) : null}
                        <td className="px-3 py-2.5">
                          {m.salon_master_id ? (
                            <button
                              type="button"
                              disabled={exporting}
                              onClick={() => downloadExport(m.salon_master_id)}
                              className="rounded-lg p-1 text-[#217346] hover:bg-green-50 disabled:opacity-50"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionShell>

      <SectionShell
        title="Записи по дням"
        description="Фиолетовый — завершённые · светлый — подтверждённые · красный — отмены"
      >
        {!hasChartData ? (
          <p className="py-8 text-center text-sm text-admin-textMuted">За этот месяц записей нет</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-3 text-xs text-admin-textMuted">
              <span>
                Всего: <strong className="text-admin-text">{chartTotal}</strong>
              </span>
              <span>Завершено: <strong className="text-violet-700">{chartCompleted}</strong></span>
              <span>Подтверждено: <strong className="text-violet-500">{chartActive - chartCompleted}</strong></span>
              <span>Отмены: <strong className="text-red-600">{chartNegative}</strong></span>
            </div>
            <div
              className="flex items-end gap-0.5 overflow-x-auto border-b border-slate-100 px-1 pb-2"
              style={{ height: CHART_HEIGHT + 48 }}
            >
              {daily.map((d) => {
                const { total, completed, confirmed, negative } = dayBarHeights(d);
                const count = d.appointments ?? 0;
                return (
                  <div
                    key={d.date}
                    className="flex w-6 shrink-0 flex-col items-center justify-end gap-0.5 sm:w-7"
                    style={{ height: CHART_HEIGHT + 36 }}
                    title={`${formatChartDay(d.date)}: ${count}`}
                  >
                    <span
                      className={`text-[8px] font-bold tabular-nums ${count > 0 ? 'text-admin-text' : 'text-transparent'}`}
                    >
                      {count || '·'}
                    </span>
                    <div
                      className="flex w-full flex-col justify-end overflow-hidden rounded-t"
                      style={{ height: `${total}px` }}
                    >
                      {negative > 0 ? (
                        <div className="w-full bg-red-400" style={{ height: `${negative}px` }} />
                      ) : null}
                      {confirmed > 0 ? (
                        <div className="w-full bg-violet-200" style={{ height: `${confirmed}px` }} />
                      ) : null}
                      {completed > 0 ? (
                        <div className="w-full bg-admin-accent" style={{ height: `${completed}px` }} />
                      ) : null}
                      {count <= 0 ? <div className="h-full w-full bg-slate-200" /> : null}
                    </div>
                    <span className="text-[7px] tabular-nums text-admin-textMuted">{formatChartDay(d.date)}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </SectionShell>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionShell title="Топ услуг">
          {top_services.length === 0 ? (
            <p className="text-sm text-admin-textMuted">Нет данных</p>
          ) : (
            <ol className="space-y-1.5">
              {top_services.map((s, i) => (
                <li
                  key={s.name}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/60"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-admin-text">{s.name}</p>
                      <p className="text-xs text-admin-textMuted">{s.count} записей</p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-violet-700">{formatPrice(s.revenue)}</p>
                </li>
              ))}
            </ol>
          )}
        </SectionShell>

        <SectionShell title="Как считается">
          <ul className="space-y-2.5 text-sm text-admin-textSecondary">
            <li className="flex gap-2">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-admin-accent" />
              <span>Месяц — с 1-го по последнее число (МСК). 1-го числа счётчик обнуляется.</span>
            </li>
            <li className="flex gap-2">
              <PiggyBank className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              <span>К выплате — доля мастера по завершённым записям месяца.</span>
            </li>
            <li className="flex gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Прошлые месяцы сохраняются — выгрузите Excel для архива.</span>
            </li>
            <li className="flex gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <span>% мастера настраивается в разделе «Мастера».</span>
            </li>
          </ul>
        </SectionShell>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  Download,
  FileSpreadsheet,
  PiggyBank,
  TrendingUp,
  Users,
  Wallet
} from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import { StatCard } from '../layout/DashboardLayout';
import { PageLoader } from '../ui/Spinner';
import SalonMasterAvatar from '../client/SalonMasterAvatar';
import { formatPrice } from '../../lib/format';

const CHART_HEIGHT = 140;

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
    const label =
      i === 0
        ? 'Текущий месяц'
        : d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    items.push({
      value,
      label: label.charAt(0).toUpperCase() + label.slice(1)
    });
  }
  return items;
}

function formatChartDay(dateStr) {
  if (!dateStr) return '';
  return `${dateStr.slice(8, 10)}.${dateStr.slice(5, 7)}`;
}

function LeaderBadge({ label, master }) {
  if (!master) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-orange-50/80 to-amber-50 px-3 py-3 shadow-sm">
      <SalonMasterAvatar
        master={master}
        size={48}
        radius={9999}
        className="ring-2 ring-white shadow-md"
        fallbackStyle={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
          color: '#fff'
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700/80">{label}</p>
        <p className="truncate text-sm font-bold text-amber-950">{master.name}</p>
        <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-700">
          {formatPrice(master.master_share)}
          <span className="ml-1 text-[11px] font-medium text-emerald-600/80">к выплате</span>
        </p>
        {master.metric_value != null && master.metric_label && (
          <p className="text-[11px] text-amber-800/70">
            {master.metric_value} {master.metric_label}
          </p>
        )}
      </div>
    </div>
  );
}

function MasterPayoutCard({ master, onExport, exporting }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-admin-border bg-white p-3 shadow-sm">
      <SalonMasterAvatar
        master={master}
        size={52}
        radius={9999}
        className="ring-2 ring-admin-border/50"
        fallbackStyle={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6A5ACD 100%)',
          color: '#fff'
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-admin-text">{master.name}</p>
        <p className="text-xs text-admin-textMuted">
          {master.commission_percent}% · {master.appointments} записей
        </p>
        <p className="mt-1 font-display text-lg font-bold tabular-nums text-emerald-700">
          {formatPrice(master.master_share)}
        </p>
      </div>
      {master.salon_master_id && (
        <button
          type="button"
          title="Excel за месяц"
          disabled={exporting}
          onClick={() => onExport(master.salon_master_id)}
          className="shrink-0 rounded-xl p-2 text-[#217346] hover:bg-green-50 transition disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function PayoutTile({ title, gross, mastersShare, salonShare, appointments, accent }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? 'border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-indigo-50'
          : 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50'
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-admin-textMuted">{title}</p>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-admin-text">
        {formatPrice(mastersShare)}
      </p>
      <p className="mt-1 text-xs text-admin-textMuted">к выплате мастерам</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-white/80 px-2.5 py-2 border border-admin-border/60">
          <p className="text-admin-textMuted">Выручка</p>
          <p className="font-bold text-admin-text tabular-nums">{formatPrice(gross)}</p>
        </div>
        <div className="rounded-lg bg-white/80 px-2.5 py-2 border border-admin-border/60">
          <p className="text-admin-textMuted">Салону</p>
          <p className="font-bold text-violet-700 tabular-nums">{formatPrice(salonShare)}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-admin-textMuted">{appointments} завершённых записей</p>
    </div>
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
      a.download = masterId
        ? `analitika-master-${month}.xlsx`
        : `analitika-salon-${month}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Отчёт скачан', 'success');
    } catch {
      toast('Не удалось выгрузить отчёт', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <PageLoader />;

  if (!data) {
    return <p className="text-sm text-admin-textMuted text-center py-12">Нет данных</p>;
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
    const barTotal = Math.max(16, Math.round((total / maxChart) * CHART_HEIGHT));
    const completed = d.completed ?? 0;
    const confirmed = d.confirmed ?? 0;
    const negative = d.negative ?? 0;
    const completedH = Math.round((completed / total) * barTotal);
    const confirmedH = Math.round((confirmed / total) * barTotal);
    const negativeH = Math.max(0, barTotal - completedH - confirmedH);
    return { total: barTotal, completed: completedH, confirmed: confirmedH, negative: negativeH };
  }

  const monthLabel =
    months.find((m) => m.value === month)?.label || month_label;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-admin-textMuted">
            Период (с 1-го числа)
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-admin-border bg-white px-3 py-2.5 text-sm font-medium text-admin-text shadow-sm focus:border-admin-accent focus:outline-none focus:ring-2 focus:ring-admin-accent/20"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          {!is_current_month && (
            <p className="text-xs text-admin-textMuted">
              Архивный месяц — данные зафиксированы. Выгрузите в Excel для отчётности.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={exporting}
          onClick={() => downloadExport()}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#217346] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-900/25 transition hover:bg-[#1a5c38] hover:shadow-green-900/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#217346] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto lg:min-w-[220px]"
        >
          {exporting ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <FileSpreadsheet className="h-5 w-5" strokeWidth={2.25} />
          )}
          Выгрузить Excel за месяц
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Выручка"
          value={formatPrice(summary.revenue)}
          hint={`${monthLabel} · завершённые`}
          accent="text-admin-accent"
        />
        <StatCard
          label="Доля салона"
          value={formatPrice(summary.salon_share)}
          hint="прибыль владельца"
          accent="text-violet-700"
        />
        <StatCard
          label="Мастерам"
          value={formatPrice(summary.masters_share)}
          hint="к выплате за месяц"
          accent="text-emerald-700"
        />
        <StatCard label="Записей" value={summary.appointments} hint={`завершено: ${summary.completed}`} />
        <StatCard
          label="Клиентов"
          value={summary.unique_clients}
          hint={`новых: ${summary.new_clients}`}
        />
        <StatCard
          label="Отмены"
          value={`${summary.cancellation_rate}%`}
          hint={`${summary.cancelled} отмен`}
        />
      </div>

      {summary.confirmed_pending > 0 && (
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm text-sky-900">
          <span className="font-semibold">Ожидается: </span>
          {formatPrice(summary.expected_revenue)} выручки, из них{' '}
          {formatPrice(summary.expected_masters_share)} мастерам — по {summary.confirmed_pending}{' '}
          подтверждённым записям (ещё не завершены).
        </div>
      )}

      <div className={`grid gap-4 ${is_current_month ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
        {is_current_month && payouts.today && (
          <PayoutTile
            title="Сегодня"
            gross={payouts.today.gross}
            mastersShare={payouts.today.masters_share}
            salonShare={payouts.today.salon_share}
            appointments={payouts.today.appointments}
          />
        )}
        <PayoutTile
          title={is_current_month ? `Месяц (${month_label})` : monthLabel}
          gross={payouts.month.gross}
          mastersShare={payouts.month.masters_share}
          salonShare={payouts.month.salon_share}
          appointments={payouts.month.appointments}
          accent
        />
      </div>

      {master_payouts?.length > 0 && (
        <Card>
          <CardHeader
            title="Выплата каждому мастеру"
            description={`За ${monthLabel.toLowerCase()} · по завершённым записям`}
          />
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
        </Card>
      )}

      {(leaders?.by_appointments || leaders?.by_clients || leaders?.by_revenue) && (
        <div className="grid gap-2 sm:grid-cols-3">
          <LeaderBadge label="Больше записей" master={leaders.by_appointments} />
          <LeaderBadge label="Больше клиентов" master={leaders.by_clients} />
          <LeaderBadge label="Больше выручки" master={leaders.by_revenue} />
        </div>
      )}

      <Card>
        <CardHeader
          title="Мастера: прибыль и выплаты"
          description="% берётся из раздела «Мастера». 1-го числа месяц начинается заново."
        />
        {by_master.length === 0 ? (
          <p className="text-sm text-admin-textMuted py-6 text-center">
            Нет записей с мастерами за выбранный месяц
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-admin-border text-left text-[11px] font-semibold uppercase tracking-wide text-admin-textMuted">
                  <th className="px-3 py-2.5">Мастер</th>
                  <th className="px-3 py-2.5 text-right">Записей</th>
                  <th className="px-3 py-2.5 text-right">Клиентов</th>
                  <th className="px-3 py-2.5 text-right">%</th>
                  <th className="px-3 py-2.5 text-right">Выручка</th>
                  <th className="px-3 py-2.5 text-right">К выплате</th>
                  <th className="px-3 py-2.5 text-right">Салону</th>
                  {is_current_month && <th className="px-3 py-2.5 text-right">Сегодня</th>}
                  <th className="px-3 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border/70">
                {by_master.map((m) => {
                  const barPct = Math.round((m.appointments / maxAppointments) * 100);
                  return (
                    <tr key={m.salon_master_id || m.name} className="hover:bg-admin-bg/60">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <SalonMasterAvatar
                            master={m}
                            size={36}
                            radius={9999}
                            fallbackStyle={{
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #6A5ACD 100%)',
                              color: '#fff',
                              fontSize: 13
                            }}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-admin-text truncate">{m.name}</p>
                            <div className="mt-1 h-1.5 w-20 max-w-full rounded-full bg-admin-border/60 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-admin-accent"
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">{m.appointments}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {m.unique_clients}
                        <span className="text-[10px] text-admin-textMuted ml-1">
                          ({m.client_share_percent}%)
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-admin-textMuted">
                        {m.commission_percent}%
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">
                        {formatPrice(m.gross_revenue)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-bold text-emerald-700">
                        {formatPrice(m.master_share)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-violet-700">
                        {formatPrice(m.salon_share)}
                      </td>
                      {is_current_month && (
                        <td className="px-3 py-3 text-right tabular-nums text-emerald-600">
                          {formatPrice(m.master_share_today)}
                        </td>
                      )}
                      <td className="px-3 py-3">
                        {m.salon_master_id && (
                          <button
                            type="button"
                            title="Excel за месяц"
                            disabled={exporting}
                            onClick={() => downloadExport(m.salon_master_id)}
                            className="rounded-lg p-1.5 text-[#217346] hover:bg-green-50 transition disabled:opacity-50"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-admin-border bg-admin-bg/50 font-semibold">
                  <td className="px-3 py-3">Итого</td>
                  <td className="px-3 py-3 text-right tabular-nums">{summary.appointments}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{summary.unique_clients}</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right tabular-nums">{formatPrice(summary.revenue)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-emerald-700">
                    {formatPrice(summary.masters_share)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-violet-700">
                    {formatPrice(summary.salon_share)}
                  </td>
                  {is_current_month && (
                    <td className="px-3 py-3 text-right tabular-nums text-emerald-600">
                      {formatPrice(payouts.today?.masters_share || 0)}
                    </td>
                  )}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Записи по дням"
          description="Фиолетовый — завершённые. Светлый — подтверждённые. Красный — отмены."
        />
        {!hasChartData ? (
          <div className="py-10 text-center">
            <p className="text-sm text-admin-textMuted">За этот месяц записей нет</p>
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
              className="flex items-end gap-0.5 overflow-x-auto border-b border-admin-border/60 px-1 pb-2"
              style={{ height: CHART_HEIGHT + 52 }}
            >
              {daily.map((d) => {
                const { total, completed, confirmed, negative } = dayBarHeights(d);
                const count = d.appointments ?? 0;
                return (
                  <div
                    key={d.date}
                    className="flex w-7 shrink-0 flex-col items-center justify-end gap-1 sm:w-8"
                    style={{ height: CHART_HEIGHT + 40 }}
                    title={`${formatChartDay(d.date)}: ${count}`}
                  >
                    <span
                      className={`text-[9px] font-bold tabular-nums leading-none ${
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
                    <span className="text-[8px] tabular-nums text-admin-textMuted">
                      {formatChartDay(d.date)}
                    </span>
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
          <CardHeader title="Как считается" description="Справка" />
          <ul className="space-y-3 text-sm text-admin-textSecondary">
            <li className="flex gap-2">
              <Wallet className="h-4 w-4 shrink-0 text-admin-accent mt-0.5" />
              <span>
                <strong className="text-admin-text">Месяц</strong> — с 1-го по последнее число (МСК).
                1-го числа счётчик обнуляется.
              </span>
            </li>
            <li className="flex gap-2">
              <PiggyBank className="h-4 w-4 shrink-0 text-violet-600 mt-0.5" />
              <span>
                <strong className="text-admin-text">К выплате</strong> — доля мастера по завершённым
                записям месяца.
              </span>
            </li>
            <li className="flex gap-2">
              <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>
                Прошлые месяцы сохраняются в базе — выгрузите Excel для архива и бухгалтерии.
              </span>
            </li>
            <li className="flex gap-2">
              <Users className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
              <span>
                % мастера настраивается в разделе <strong className="text-admin-text">Мастера</strong>.
              </span>
            </li>
            <li className="flex gap-2">
              <CalendarCheck className="h-4 w-4 shrink-0 text-admin-textMuted mt-0.5" />
              <span>
                Зелёная кнопка — полный отчёт за выбранный месяц в Excel.
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

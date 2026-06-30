import { useEffect, useMemo, useState } from 'react';
import { Download, Users, UserX, Wallet, CalendarDays, FileSpreadsheet, TrendingUp } from 'lucide-react';
import Button from '../ui/Button';
import { CountUp } from '../lightswind/count-up';
import { SpectrumLoader } from '../lightswind/SpectrumLoader';

function MoneyValue({ value, className = '' }) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return <span className={className}>{value}</span>;
  return (
    <CountUp
      value={numeric}
      decimals={0}
      suffix=" ₽"
      separator=" "
      triggerOnView
      duration={0.9}
      className={className}
    />
  );
}

function IntValue({ value, className = '' }) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return <span className={className}>{value}</span>;
  return (
    <CountUp value={numeric} decimals={0} separator=" " triggerOnView duration={0.8} className={className} />
  );
}

function monthOptions() {
  const items = [{ value: 'all', label: 'За всё время' }];
  const now = new Date();
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    items.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return items;
}

export default function OverviewStatsCard({ api, isTeamMember = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportMonth, setExportMonth] = useState('all');
  const [exporting, setExporting] = useState(false);
  const months = useMemo(() => monthOptions(), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/master/me/overview-stats')
      .then((res) => {
        if (!cancelled) setStats(res.data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const downloadReport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/master/me/revenue-export', {
        params: { month: exportMonth },
        responseType: 'blob'
      });
      const ext = isTeamMember ? 'csv' : 'xlsx';
      const mime = isTeamMember
        ? 'text/csv;charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([res.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        exportMonth === 'all' ? `vyruchka-vse-vremya.${ext}` : `vyruchka-${exportMonth}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[1.35rem] bg-white py-12 shadow-sm ring-1 ring-slate-200/80">
        <SpectrumLoader size={40} colors={['#6A5ACD', '#8477DD', '#A78BFA', '#C4B5FD', '#6A5ACD', '#E9D5FF']} />
        <p className="text-sm text-admin-textMuted">Загружаем сводку…</p>
      </div>
    );
  }

  if (!stats) return null;

  const revenueTodayLabel = isTeamMember ? 'Доля сегодня' : 'Сегодня';
  const revenueMonthLabel = isTeamMember ? `Доля · ${stats.month_label}` : `Месяц · ${stats.month_label}`;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <h2 className="text-base font-bold text-admin-text">Сводка</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
          <TrendingUp className="h-3.5 w-3.5" />
          Live
        </span>
      </div>

      <div className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
        <div className="bg-gradient-to-br from-[#6A5ACD] to-[#4F46E5] px-4 py-5 text-white sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{revenueMonthLabel}</p>
              <p className="mt-2 font-display text-3xl font-bold tabular-nums leading-none text-white sm:text-4xl">
                <MoneyValue value={stats.revenue_month} className="text-white" />
              </p>
              <p className="mt-2 text-xs text-white/70">С 1-го числа текущего месяца</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
          <div className="px-3 py-4 text-center sm:px-4">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Wallet className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-admin-textMuted">{revenueTodayLabel}</p>
            <p className="mt-1 text-base font-bold tabular-nums text-admin-text sm:text-lg">
              <MoneyValue value={stats.revenue_today} />
            </p>
          </div>
          <div className="px-3 py-4 text-center sm:px-4">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-admin-textMuted">Клиенты</p>
            <p className="mt-1 text-base font-bold tabular-nums text-admin-text sm:text-lg">
              <IntValue value={stats.clients_total} />
            </p>
          </div>
          <div className="px-3 py-4 text-center sm:px-4">
            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <UserX className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-admin-textMuted">30+ дн.</p>
            <p className="mt-1 text-base font-bold tabular-nums text-admin-text sm:text-lg">
              <IntValue value={stats.clients_inactive_30d} />
            </p>
          </div>
        </div>
      </div>

      {isTeamMember && stats.commission_percent != null && (
        <p className="rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-800 ring-1 ring-violet-100">
          Ваша доля — <span className="font-semibold">{stats.commission_percent}%</span> от стоимости услуги
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-[1.35rem] bg-white p-4 ring-1 ring-slate-200/70 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-admin-text">Отчёт по выручке</p>
            <p className="text-xs text-admin-textSecondary">Скачать Excel или CSV</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={downloadReport} loading={exporting}>
            <Download className="h-4 w-4" />
            Скачать
          </Button>
        </div>
      </div>
    </section>
  );
}

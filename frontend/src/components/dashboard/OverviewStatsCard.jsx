import { useEffect, useMemo, useState } from 'react';
import { Download, Users, UserX, Wallet, CalendarDays, FileSpreadsheet } from 'lucide-react';
import Button from '../ui/Button';
import { formatPrice } from '../../lib/format';

const TILE_STYLES = {
  clients: {
    wrap: 'border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-white',
    icon: 'bg-violet-100 text-violet-600',
    value: 'text-violet-950',
    label: 'text-violet-600/80'
  },
  inactive: {
    wrap: 'border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-white',
    icon: 'bg-amber-100 text-amber-700',
    value: 'text-amber-950',
    label: 'text-amber-700/80',
    hint: 'text-amber-700/60'
  },
  today: {
    wrap: 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 via-white to-white',
    icon: 'bg-emerald-500 text-white shadow-sm shadow-emerald-200',
    value: 'text-emerald-700',
    label: 'text-emerald-700/70'
  },
  month: {
    wrap: 'border-0 bg-gradient-to-br from-[#6A5ACD] via-violet-600 to-indigo-700 shadow-lg shadow-violet-300/30',
    icon: 'bg-white/15 text-white ring-1 ring-white/25',
    value: 'text-white',
    label: 'text-white/75',
    hint: 'text-white/60'
  }
};

function StatTile({ label, value, hint, Icon, variant = 'clients' }) {
  const s = TILE_STYLES[variant];
  const isHero = variant === 'month';

  return (
    <div
      className={`relative flex h-full min-h-[132px] flex-col overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${s.wrap}`}
    >
      {isHero && (
        <>
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 left-1/3 h-20 w-20 rounded-full bg-indigo-400/20 blur-2xl" />
        </>
      )}
      <div className="relative flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${s.label}`}>{label}</p>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.icon}`}>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>
        <div>
          <p className={`font-display text-2xl font-bold tabular-nums leading-none ${s.value}`}>{value}</p>
          <p className={`mt-2 min-h-[32px] text-xs leading-snug ${hint ? s.hint || 'text-admin-textSecondary' : 'invisible'}`}>
            {hint || '—'}
          </p>
        </div>
      </div>
    </div>
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[132px] animate-pulse rounded-2xl bg-violet-100/40" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const revenueTodayLabel = isTeamMember ? 'Доля сегодня' : 'Выручка сегодня';
  const revenueMonthLabel = isTeamMember
    ? `Доля за ${stats.month_label}`
    : `Выручка за ${stats.month_label}`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-admin-text">Сводка</h2>
        <p className="text-sm text-admin-textSecondary">
          {isTeamMember ? 'Ваши клиенты и доход' : 'Показатели салона за сегодня и месяц'}
        </p>
      </div>

      <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile
          variant="month"
          label={revenueMonthLabel}
          value={formatPrice(stats.revenue_month)}
          hint="Считается с 1-го числа месяца"
          Icon={CalendarDays}
        />
        <StatTile
          variant="today"
          label={revenueTodayLabel}
          value={formatPrice(stats.revenue_today)}
          Icon={Wallet}
        />
        <StatTile variant="clients" label="Клиенты" value={stats.clients_total} Icon={Users} />
        <StatTile
          variant="inactive"
          label="Без записи 30+ дн."
          value={stats.clients_inactive_30d}
          hint="Были визиты, но давно"
          Icon={UserX}
        />
      </div>

      {isTeamMember && stats.commission_percent != null && (
        <p className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs text-violet-800">
          Ваша доля — <span className="font-semibold">{stats.commission_percent}%</span> от стоимости каждой
          услуги
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 via-white to-violet-50/40 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-admin-accent shadow-sm ring-1 ring-slate-200/80">
            <FileSpreadsheet className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-admin-text">Отчёт по выручке</p>
            <p className="text-xs text-admin-textSecondary">
              {isTeamMember
                ? 'Только ваши записи: сумма услуги и ваша прибыль'
                : 'Excel: сводка, все записи и отдельный лист на каждого мастера'}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
            className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-admin-text shadow-sm"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={downloadReport} loading={exporting} className="shadow-sm">
            <Download className="h-4 w-4" />
            Скачать
          </Button>
        </div>
      </div>
    </div>
  );
}

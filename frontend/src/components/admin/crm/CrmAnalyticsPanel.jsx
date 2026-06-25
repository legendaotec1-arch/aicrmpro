import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

function pct(num, den) {
  if (!den) return '—';
  return `${Math.round((num / den) * 100)}%`;
}

function FunnelRow({ label, week, month, all, goal }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2.5 pr-4 font-medium text-slate-800">{label}</td>
      <td className="py-2.5 px-2 text-center text-slate-700">{week ?? '—'}</td>
      <td className="py-2.5 px-2 text-center text-slate-700">{month ?? '—'}</td>
      <td className="py-2.5 px-2 text-center font-semibold text-violet-700">{all ?? '—'}</td>
      <td className="py-2.5 pl-2 text-center text-xs text-slate-400">{goal || '—'}</td>
    </tr>
  );
}

export default function CrmAnalyticsPanel({ stats, analytics }) {
  const goals = useMemo(() => {
    const map = {};
    (analytics || []).forEach((r) => { map[r.metric_key] = r.goal_value; });
    return map;
  }, [analytics]);

  const w = stats?.week || {};
  const m = stats?.month || {};
  const a = stats?.all || {};

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <TrendingUp size={18} className="text-violet-600" />
        Воронка (авто из лидов)
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <th className="py-2 pl-4 text-left">Этап</th>
              <th className="px-2 py-2">7 дней</th>
              <th className="px-2 py-2">30 дней</th>
              <th className="px-2 py-2">Всего</th>
              <th className="pr-4 py-2">Цель</th>
            </tr>
          </thead>
          <tbody>
            <FunnelRow label="Отправлено" week={w.sent} month={m.sent} all={a.sent} goal={goals.sent} />
            <FunnelRow label="Ответили" week={w.replies} month={m.replies} all={a.replies} goal={goals.replies} />
            <FunnelRow label="% ответов" week={pct(w.replies, w.sent)} month={pct(m.replies, m.sent)} all={pct(a.replies, a.sent)} goal={goals.reply_pct} />
            <FunnelRow label="Демо" week={w.demos} month={m.demos} all={a.demos} goal={goals.demos} />
            <FunnelRow label="Регистрации" week={w.registrations} month={m.registrations} all={a.registrations} goal={goals.registrations} />
            <FunnelRow label="Клиенты" week={w.clients} month={m.clients} all={a.clients} goal={goals.paid} />
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Цели — из настроек CRM. Считается по статусам лидов за период (дата контакта).
      </p>
    </div>
  );
}

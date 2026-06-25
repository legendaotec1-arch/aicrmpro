import { useMemo, useState } from 'react';
import { Plus, Search, Filter, CalendarClock, UserPlus } from 'lucide-react';
import Button from '../../ui/Button';
import { STATUS_COLORS, PLATFORM_COLORS } from './adminCrmConstants';

export default function CrmLeadsPanel({
  leads,
  statuses,
  stats,
  onOpenLead,
  onQuickAdd,
  onStatusFilter,
  statusFilter,
}) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    let list = [...leads];
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((l) => l.status === statusFilter);
    }
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((l) =>
        [l.contact, l.name, l.city, l.niche, l.note, l.platform]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle))
      );
    }
    return list;
  }, [leads, q, statusFilter]);

  const activeStatuses = statuses.filter((s) => (stats?.byStatus?.[s] || 0) > 0 || ['Новый', 'Отправлено', 'Ответил', 'Дожим'].includes(s));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
              placeholder="Поиск: @контакт, имя, город, ниша…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button type="button" onClick={onQuickAdd}>
            <UserPlus size={16} className="mr-1.5" />
            Новый лид
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Filter size={12} /> Статус:
          </span>
          <button
            type="button"
            onClick={() => onStatusFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Все ({leads.length})
          </button>
          {activeStatuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onStatusFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                statusFilter === s ? STATUS_COLORS[s] : `${STATUS_COLORS[s]} opacity-70 hover:opacity-100`
              }`}
            >
              {s} ({stats?.byStatus?.[s] || 0})
            </button>
          ))}
          {stats?.dueToday > 0 ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              <CalendarClock size={12} />
              Сегодня: {stats.dueToday}
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="rounded-2xl bg-violet-50 p-4 text-violet-600">
              <Plus size={28} />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-900">Лидов пока нет</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Добавьте контакт мастера из Instagram или Telegram — запишите @username и статус «Новый».
            </p>
            <Button type="button" className="mt-4" onClick={onQuickAdd}>
              <UserPlus size={16} className="mr-1.5" />
              Добавить первого лида
            </Button>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Контакт</th>
                <th className="px-4 py-3 hidden sm:table-cell">Площадка</th>
                <th className="px-4 py-3 hidden md:table-cell">Ниша</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3 hidden lg:table-cell">След. шаг</th>
                <th className="px-4 py-3 hidden md:table-cell">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((lead) => {
                const statusClass = STATUS_COLORS[lead.status] || STATUS_COLORS['Новый'];
                const platformClass = PLATFORM_COLORS[lead.platform] || PLATFORM_COLORS['Другое'];
                const nextDate = lead.next_action_date?.slice?.(0, 10) || lead.next_action_date;
                return (
                  <tr
                    key={lead.id}
                    className="cursor-pointer transition hover:bg-violet-50/50"
                    onClick={() => onOpenLead(lead)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-slate-900">{lead.contact || '—'}</p>
                      <p className="text-xs text-slate-500">{[lead.name, lead.city].filter(Boolean).join(' · ') || 'Без имени'}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {lead.platform ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${platformClass}`}>
                          {lead.platform}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600">{lead.niche || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusClass}`}>
                        {lead.status || 'Новый'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell max-w-[200px]">
                      <p className="truncate text-slate-700">{lead.next_action || '—'}</p>
                      {nextDate ? <p className="text-xs text-slate-400">{nextDate}</p> : null}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap text-slate-500">
                      {lead.lead_date?.slice?.(0, 10) || lead.lead_date || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

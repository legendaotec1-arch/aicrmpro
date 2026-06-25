import { useMemo, useState } from 'react';
import { Plus, Calendar, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import Button from '../../ui/Button';
import { CopyButton } from './CrmUiParts';

export default function CrmFollowupSheet({ followups, onPatch, onAdd, onDelete }) {
  const [filter, setFilter] = useState('all');

  const sorted = useMemo(() => {
    let list = [...(followups || [])];
    if (filter === 'pending') list = list.filter((f) => f.sent !== '✅');
    if (filter === 'done') list = list.filter((f) => f.sent === '✅');
    return list.sort((a, b) => {
      const da = a.touch_date || '';
      const db = b.touch_date || '';
      return da.localeCompare(db);
    });
  }, [followups, filter]);

  const pendingCount = (followups || []).filter((f) => f.sent !== '✅').length;

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-violet-50/30 to-white">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {[
            { id: 'all', label: 'Все' },
            { id: 'pending', label: `Ожидают (${pendingCount})` },
            { id: 'done', label: 'Отправлено' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button type="button" size="sm" onClick={onAdd}>
          <Plus size={14} className="mr-1" /> Касание
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {sorted.map((row) => {
            const done = row.sent === '✅';
            const dateStr = row.touch_date?.slice?.(0, 10) || row.touch_date || '';
            return (
              <article
                key={row.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                  done ? 'border-emerald-200 opacity-80' : 'border-violet-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onPatch(row.id, 'sent', done ? '⬜' : '✅')}
                      className={`mt-0.5 shrink-0 rounded-full p-0.5 transition ${done ? 'text-emerald-600' : 'text-slate-300 hover:text-violet-600'}`}
                      title={done ? 'Отметить неотправленным' : 'Отметить отправленным'}
                    >
                      {done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                    </button>
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-slate-900">{row.contact || '— контакт —'}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        {dateStr ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
                            <Calendar size={12} /> {dateStr}
                          </span>
                        ) : null}
                        {row.touch_number ? (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-800">
                            Касание №{row.touch_number}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <button type="button" className="text-slate-400 hover:text-red-500" onClick={() => onDelete(row.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_100px_120px]">
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                    placeholder="@контакт"
                    defaultValue={row.contact || ''}
                    onBlur={(e) => onPatch(row.id, 'contact', e.target.value)}
                  />
                  <input
                    type="date"
                    className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    defaultValue={dateStr}
                    onBlur={(e) => onPatch(row.id, 'touch_date', e.target.value || null)}
                  />
                  <input
                    type="number"
                    min={1}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="№"
                    defaultValue={row.touch_number ?? ''}
                    onBlur={(e) => onPatch(row.id, 'touch_number', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
                <textarea
                  rows={3}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm leading-relaxed"
                  placeholder="Текст сообщения для дожима…"
                  defaultValue={row.message_text || ''}
                  onBlur={(e) => onPatch(row.id, 'message_text', e.target.value)}
                />
                <div className="mt-2 flex justify-end">
                  <CopyButton text={row.message_text} />
                </div>
              </article>
            );
          })}
          {!sorted.length ? (
            <p className="py-16 text-center text-sm text-slate-400">Нет касаний — добавьте первое</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

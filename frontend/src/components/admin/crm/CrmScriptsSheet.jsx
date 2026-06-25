import { useMemo, useState } from 'react';
import { Plus, Save, Search, Trash2, MessageSquare } from 'lucide-react';
import Button from '../../ui/Button';
import { CopyButton } from './CrmUiParts';

export default function CrmScriptsSheet({ rows, onChange, onSave, saving }) {
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => (r.cols || []).some((c) => String(c).toLowerCase().includes(needle)));
  }, [rows, q]);

  const update = (idx, colIdx, val) => {
    const next = rows.map((r, i) => {
      if (i !== idx) return r;
      const cols = [...(r.cols || ['', '', '', ''])];
      while (cols.length < 4) cols.push('');
      cols[colIdx] = val;
      return { ...r, cols };
    });
    onChange(next);
  };

  const add = () => onChange([...rows, { cols: [String(rows.length + 1), '', '', ''], sort_order: rows.length }]);
  const remove = (idx) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-50 to-white">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#217346] focus:ring-2 focus:ring-[#217346]/15"
            placeholder="Поиск по скриптам…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={add}>
          <Plus size={14} className="mr-1" /> Скрипт
        </Button>
        <Button type="button" size="sm" loading={saving} onClick={onSave}>
          <Save size={14} className="mr-1" /> Сохранить
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.map((row, ri) => {
          const cols = row.cols || [];
          const realIdx = rows.indexOf(row);
          const expanded = openId === (row.id || `i-${realIdx}`);
          const text = cols[3] || '';
          return (
            <article
              key={row.id || `script-${ri}`}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <button
                type="button"
                className="flex w-full items-start gap-3 p-4 text-left hover:bg-slate-50/80"
                onClick={() => setOpenId(expanded ? null : (row.id || `i-${realIdx}`))}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#217346]/10 text-sm font-bold text-[#217346]">
                  {cols[0] || ri + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2 mb-1">
                    {cols[1] ? (
                      <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800">{cols[1]}</span>
                    ) : null}
                    {cols[2] ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{cols[2]}</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{text || 'Текст не задан'}</p>
                </div>
                <MessageSquare size={18} className="shrink-0 text-slate-300 mt-1" />
              </button>
              {expanded ? (
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block text-xs font-medium text-slate-500">
                      №
                      <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={cols[0] || ''} onChange={(e) => update(realIdx, 0, e.target.value)} />
                    </label>
                    <label className="block text-xs font-medium text-slate-500">
                      Для кого
                      <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={cols[1] || ''} onChange={(e) => update(realIdx, 1, e.target.value)} />
                    </label>
                    <label className="block text-xs font-medium text-slate-500">
                      Название
                      <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={cols[2] || ''} onChange={(e) => update(realIdx, 2, e.target.value)} />
                    </label>
                  </div>
                  <label className="block text-xs font-medium text-slate-500">
                    Текст сообщения
                    <textarea
                      rows={5}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-relaxed"
                      value={text}
                      onChange={(e) => update(realIdx, 3, e.target.value)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton text={text} label="Копировать текст" />
                    <Button type="button" size="sm" variant="secondary" onClick={() => remove(realIdx)}>
                      <Trash2 size={14} className="mr-1 text-red-500" /> Удалить
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-100 px-4 py-2 flex justify-end">
                  <CopyButton text={text} />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

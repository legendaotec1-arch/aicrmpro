import { useMemo, useState } from 'react';
import { Plus, Save, Search, Trash2, MessageCircleReply } from 'lucide-react';
import Button from '../../ui/Button';
import { CopyButton } from './CrmUiParts';

export default function CrmAnswersSheet({ rows, onChange, onSave, saving }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => (r.cols || []).some((c) => String(c).toLowerCase().includes(needle)));
  }, [rows, q]);

  const update = (idx, colIdx, val) => {
    const next = rows.map((r, i) => {
      if (i !== idx) return r;
      const cols = [...(r.cols || ['', ''])];
      cols[colIdx] = val;
      return { ...r, cols };
    });
    onChange(next);
  };

  const add = () => onChange([...rows, { cols: ['', ''], sort_order: rows.length }]);
  const remove = (idx) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-amber-50/40 to-white">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
            placeholder="Поиск по возражениям…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={add}>
          <Plus size={14} className="mr-1" /> Ответ
        </Button>
        <Button type="button" size="sm" loading={saving} onClick={onSave}>
          <Save size={14} className="mr-1" /> Сохранить
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
        {filtered.map((row, ri) => {
          const cols = row.cols || [];
          const realIdx = rows.indexOf(row);
          const question = cols[0] || '';
          const answer = cols[1] || '';
          return (
            <article key={row.id || `ans-${ri}`} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div className="p-4 bg-slate-50/80">
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <MessageCircleReply size={14} /> Клиент
                  </p>
                  <textarea
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                    placeholder="«А что это?»"
                    value={question}
                    onChange={(e) => update(realIdx, 0, e.target.value)}
                  />
                </div>
                <div className="p-4 bg-emerald-50/50">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-700">Ваш ответ</p>
                  <textarea
                    rows={4}
                    className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800"
                    placeholder="Текст ответа…"
                    value={answer}
                    onChange={(e) => update(realIdx, 1, e.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <CopyButton text={answer} label="Копировать ответ" />
                    <Button type="button" size="sm" variant="secondary" onClick={() => remove(realIdx)}>
                      <Trash2 size={14} className="mr-1 text-red-500" /> Удалить
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

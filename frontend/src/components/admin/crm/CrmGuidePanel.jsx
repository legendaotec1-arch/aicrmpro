import { useState } from 'react';
import { Save } from 'lucide-react';
import Button from '../../ui/Button';
import { CopyButton } from './CrmUiParts';
import { GUIDE_SECTIONS } from './adminCrmConstants';

export default function CrmGuidePanel({ staticContent, searchRows, onSaveStatic, saving }) {
  const [section, setSection] = useState('instruction');
  const [draft, setDraft] = useState(staticContent?.instruction || '');

  const switchSection = (id) => {
    setSection(id);
    setDraft(staticContent?.[id] || '');
  };

  const save = () => onSaveStatic(section, draft);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap gap-1 border-b border-slate-200 bg-white p-2">
        {GUIDE_SECTIONS.map(({ id, label, emoji }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchSection(id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              section === id ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {emoji} {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSection('search')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            section === 'search' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🔍 Где искать
        </button>
      </div>

      {section === 'search' ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-3 text-sm text-slate-600">Идеи для поиска лидов — редактируются во вкладке «Скрипты» → раздел поиска в справочнике.</p>
          <div className="space-y-2">
            {(searchRows || []).map((row, i) => {
              const cols = row.cols || [];
              return (
                <article key={row.id || i} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <p className="font-semibold text-slate-900">{cols[0]}</p>
                  <p className="text-xs text-violet-700">{cols[1]}</p>
                  <p className="mt-1 text-slate-600">{cols[2]}</p>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <textarea
            className="min-h-[280px] flex-1 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm leading-relaxed font-mono whitespace-pre-wrap"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={saving} onClick={save}>
              <Save size={14} className="mr-1" /> Сохранить
            </Button>
            <CopyButton text={draft} label="Копировать" />
          </div>
        </div>
      )}
    </div>
  );
}

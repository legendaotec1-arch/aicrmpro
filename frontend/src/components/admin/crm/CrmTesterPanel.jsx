import { useMemo, useState } from 'react';
import { Flame, ChevronDown, MessageSquare, MessageCircleReply, BookOpen, Wrench } from 'lucide-react';
import { CopyButton } from './CrmUiParts';

const SECTIONS = [
  { id: 'scripts', label: 'Скрипты', icon: MessageSquare },
  { id: 'answers', label: 'Ответы', icon: MessageCircleReply },
  { id: 'dialogue', label: 'Диалог', icon: BookOpen },
  { id: 'tech', label: 'Шпаргалка', icon: Wrench },
  { id: 'memo', label: 'Памятка', icon: Flame },
];

function StaticBlock({ title, content }) {
  if (!content) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{content}</pre>
      <div className="mt-3">
        <CopyButton text={content} label="Копировать" />
      </div>
    </div>
  );
}

function ScriptCard({ cols }) {
  const [open, setOpen] = useState(false);
  const num = cols[0];
  const title = cols[2];
  const text = cols[3] || '';

  return (
    <article className="rounded-2xl border border-orange-200 bg-gradient-to-br from-white to-orange-50/40 shadow-sm overflow-hidden">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-white">
          {num}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{title}</p>
          <p className={`mt-1 text-sm text-slate-600 ${open ? '' : 'line-clamp-2'}`}>{text}</p>
        </div>
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="border-t border-orange-100 bg-white/80 px-4 py-3 flex justify-end">
          <CopyButton text={text} label="Копировать скрипт" />
        </div>
      ) : (
        <div className="border-t border-orange-100 px-4 py-2 flex justify-end">
          <CopyButton text={text} />
        </div>
      )}
    </article>
  );
}

export default function CrmTesterPanel({ scripts, answers, staticContent }) {
  const [section, setSection] = useState('scripts');

  const testerScripts = useMemo(
    () => (scripts || []).filter((r) => (r.cols || [])[1] === 'Тестировщик'),
    [scripts]
  );

  const testerAnswers = useMemo(() => {
    const markers = new Set([
      '«А что за сайт?»',
      '«А что за рассылки?»',
      '«А где авторизация?»',
      '«Хорошо, давай попробую»',
      '«А что за отзыв?»',
    ]);
    return (answers || []).filter((r) => {
      const q = (r.cols || [])[0] || '';
      return markers.has(q) || q.includes('(тест)');
    });
  }, [answers]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-orange-900">
          <Flame size={16} className="text-orange-500" />
          Скрипт «Тестировщик» — обновлённый под Woner.ru
        </p>
        <p className="mt-1 text-xs text-orange-800/80">
          Сайт + CRM, бесплатные рассылки, вход через Telegram / MAX / Mail. Ты просишь помочь, а не продаёшь.
        </p>
        {staticContent?.tester_changes ? (
          <pre className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
            {staticContent.tester_changes}
          </pre>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap gap-1 border-b border-slate-200 bg-white p-2">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              section === id ? 'bg-orange-500 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon size={14} />
            {label}
            {id === 'scripts' ? ` (${testerScripts.length})` : ''}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {section === 'scripts' ? (
          <div className="mx-auto max-w-3xl space-y-3">
            {testerScripts.map((row) => (
              <ScriptCard key={row.id || row.cols?.[0]} cols={row.cols || []} />
            ))}
            {!testerScripts.length ? (
              <p className="py-12 text-center text-sm text-slate-500">Скрипты загружаются… Обновите страницу.</p>
            ) : null}
          </div>
        ) : null}

        {section === 'answers' ? (
          <div className="mx-auto max-w-3xl space-y-3">
            {testerAnswers.map((row, i) => {
              const cols = row.cols || [];
              return (
                <article key={row.id || i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    <div className="bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase text-slate-400 mb-2">Клиент</p>
                      <p className="text-sm font-medium text-slate-900">{cols[0]}</p>
                    </div>
                    <div className="bg-emerald-50/50 p-4">
                      <p className="text-xs font-bold uppercase text-emerald-700 mb-2">Ваш ответ</p>
                      <p className="text-sm leading-relaxed text-slate-800">{cols[1]}</p>
                      <div className="mt-3">
                        <CopyButton text={cols[1]} label="Копировать" />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {section === 'dialogue' ? (
          <div className="mx-auto max-w-3xl space-y-4">
            <StaticBlock title="Пример полного диалога" content={staticContent?.tester_dialogue} />
            <StaticBlock title="Главные акценты" content={staticContent?.tester_principles} />
          </div>
        ) : null}

        {section === 'tech' ? (
          <div className="mx-auto max-w-3xl">
            <StaticBlock title="Техническая шпаргалка" content={staticContent?.tester_tech} />
          </div>
        ) : null}

        {section === 'memo' ? (
          <div className="mx-auto max-w-3xl">
            <StaticBlock title="Резюме — что запомнить" content={staticContent?.tester_summary} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

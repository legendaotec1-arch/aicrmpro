import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { STATUS_COLORS, PLATFORM_COLORS } from './adminCrmConstants';

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function CopyButton({ text, label = 'Копировать' }) {
  const [ok, setOk] = useState(false);
  if (!text?.trim()) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        const done = await copyText(text);
        if (done) {
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-[#217346] hover:text-[#217346]"
    >
      {ok ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
      {ok ? 'Скопировано' : label}
    </button>
  );
}

const cellBase =
  'w-full rounded-lg border border-transparent bg-transparent px-2.5 py-2 text-sm text-slate-800 outline-none transition hover:border-slate-200 hover:bg-white focus:border-[#217346] focus:bg-white focus:ring-2 focus:ring-[#217346]/20';

export function CrmLeadCell({ col, value, statuses, platforms, onBlur }) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => setLocal(value ?? ''), [value]);

  const commit = (v) => {
    setLocal(v);
    if (v !== (value ?? '')) onBlur(v);
  };

  if (col.type === 'status') {
    const color = STATUS_COLORS[local] || STATUS_COLORS['Новый'];
    return (
      <select
        className={`${cellBase} cursor-pointer border font-semibold text-xs ${color}`}
        value={local || 'Новый'}
        onChange={(e) => commit(e.target.value)}
      >
        {statuses.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    );
  }

  if (col.type === 'platform') {
    const color = PLATFORM_COLORS[local] || PLATFORM_COLORS['Другое'];
    return (
      <select
        className={`${cellBase} cursor-pointer border font-medium text-xs ${color}`}
        value={local || ''}
        onChange={(e) => commit(e.target.value)}
      >
        <option value="">— площадка —</option>
        {platforms.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    );
  }

  if (col.type === 'textarea') {
    return (
      <textarea
        rows={2}
        placeholder={col.placeholder}
        className={`${cellBase} min-h-[56px] resize-y`}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { if (local !== (value ?? '')) onBlur(local); }}
      />
    );
  }

  return (
    <input
      type={col.type === 'date' ? 'date' : 'text'}
      placeholder={col.placeholder}
      className={`${cellBase} ${col.key === 'contact' ? 'font-mono text-xs' : ''}`}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== (value ?? '')) onBlur(local); }}
    />
  );
}

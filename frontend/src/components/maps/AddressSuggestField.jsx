import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export default function AddressSuggestField({
  api,
  value,
  onChange,
  onSelect,
  label = 'Адрес',
  hint = 'Начните вводить адрес — появятся подсказки'
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const q = String(value || '').trim();
    if (q.length < 2) {
      setSuggestions([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/master/me/address-suggest', { params: { q } });
        setSuggestions(res.data?.suggestions || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, api]);

  const pick = async (item) => {
    setOpen(false);
    onChange(item.label);
    try {
      const res = await api.post('/master/me/geocode', { address: item.label });
      onSelect?.(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="label-field">{label}</label>
      <input
        className="input-field"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="г. Курган, ул. ..."
        autoComplete="street-address"
      />
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {loading && <p className="mt-1 text-xs text-ink-muted">Ищем адрес…</p>}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-elevated">
          {suggestions.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                onClick={() => pick(item)}
              >
                <span className="font-medium text-ink">{item.title}</span>
                {item.subtitle && <span className="block text-xs text-ink-muted">{item.subtitle}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { CLIENT_THEMES, THEME_SECTIONS, getThemesBySection } from '../../config/clientThemes';

function ThemePreview({ theme, selected, onSelect }) {
  const bg = theme.vars?.bg || theme.vars?.background || '#F5F5F5';
  const accent = theme.vars?.accent || '#0ABAB5';
  const text = theme.vars?.text || '#151719';
  const accentSoft = theme.vars?.accentSoft || 'rgba(10,186,181,0.12)';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border-2 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 ${
        selected
          ? 'border-primary shadow-lg shadow-primary/20'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div className="relative">
        <div className="h-24 sm:h-28" style={{ background: bg }} />
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.00) 45%, rgba(255,255,255,0.10) 100%)'
          }}
          aria-hidden
        />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span
            className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold shadow-sm ring-1 ring-black/10"
            style={{ background: accent, color: 'white' }}
          >
            {theme.name}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full ring-2 ring-white/60" style={{ background: accent }} />
            <span className="h-5 w-5 rounded-full ring-2 ring-white/60" style={{ background: bg }} />
            <span className="h-5 w-5 rounded-full ring-2 ring-white/60" style={{ background: text }} />
            <span className="ml-auto h-7 w-16 rounded-xl bg-white/10 ring-1 ring-white/25 backdrop-blur" />
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 bg-white px-4 pb-4 pt-3">
        <p className="text-sm font-semibold leading-tight text-ink">{theme.name}</p>
        <p className="text-xs leading-snug text-ink-muted">{theme.niche}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: accentSoft, color: accent }}>
            Кнопки
          </span>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-ink-secondary">
            Карточки
          </span>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-ink-secondary">
            Слоты
          </span>
        </div>
      </div>
      {selected && (
        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-md ring-2 ring-white/40">
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </span>
      )}
    </button>
  );
}

function ThemeGrid({ themes, selected, onSelect }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {themes.map((theme) => (
        <ThemePreview
          key={theme.id}
          theme={theme}
          selected={selected === theme.id}
          onSelect={() => onSelect(theme.id)}
        />
      ))}
    </div>
  );
}

export default function ThemesSection({ currentThemeId, onSave, toast }) {
  const [selected, setSelected] = useState(currentThemeId || 'basic');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(currentThemeId || 'basic');
  }, [currentThemeId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected);
      toast?.('Тема сохранена — клиенты увидят её на странице записи', 'success');
    } catch {
      toast?.('Не удалось сохранить тему', 'error');
    } finally {
      setSaving(false);
    }
  };

  const changed = selected !== (currentThemeId || 'basic');
  const totalCount = CLIENT_THEMES.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Темы оформления</h1>
        <p className="mt-1 text-sm text-ink-secondary max-w-2xl">
          Выберите стиль страницы онлайн-записи. Тема сохраняется для всех клиентов по вашей ссылке.
          Экран входа (Telegram / MAX) остаётся светлым и не меняется.
        </p>
      </div>

      {THEME_SECTIONS.map((section) => {
        const themes = getThemesBySection(section.id);
        if (!themes.length) return null;
        return (
          <Card key={section.id}>
            <CardHeader title={section.title} description={section.description} />
            <ThemeGrid themes={themes} selected={selected} onSelect={setSelected} />
          </Card>
        );
      })}

      <div className="sticky bottom-4 z-10">
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-card backdrop-blur">
          <Button onClick={handleSave} loading={saving} disabled={!changed && !saving} className="w-full sm:w-auto">
          <Palette className="h-4 w-4" />
          Сохранить тему
          </Button>
          {changed && <p className="text-sm text-ink-muted">Есть несохранённые изменения</p>}
          <p className="text-xs text-ink-muted sm:ml-auto">{totalCount} тем на выбор</p>
        </div>
      </div>
    </div>
  );
}

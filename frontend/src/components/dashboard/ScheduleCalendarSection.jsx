import { useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { CalendarDays, Eraser, Save } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { eachDateInRange, formatDateKey, getRuHolidays } from '../../lib/ruHolidays';

const MODES = {
  close: { id: 'close', label: 'Выходной', hint: 'Нажмите день или выберите период' },
  remove: { id: 'remove', label: 'Снять отметку', hint: 'Убрать выходной с выбранных дней' }
};

function normalizeExceptionDate(raw) {
  if (!raw) return '';
  return String(raw).slice(0, 10);
}

export default function ScheduleCalendarSection({
  exceptions,
  api,
  salonMasterId,
  onChanged,
  toast
}) {
  const [activeMonth, setActiveMonth] = useState(() => new Date());
  const [mode, setMode] = useState('close');
  const [rangePickMode, setRangePickMode] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [pendingKeys, setPendingKeys] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  const year = activeMonth.getFullYear();
  const holidays = useMemo(() => getRuHolidays(year), [year]);

  const exceptionMap = useMemo(() => {
    const map = new Map();
    for (const ex of exceptions || []) {
      map.set(normalizeExceptionDate(ex.exception_date), ex);
    }
    return map;
  }, [exceptions]);

  const upcoming = useMemo(() => {
    const today = formatDateKey(new Date());
    return [...(exceptions || [])]
      .filter((ex) => normalizeExceptionDate(ex.exception_date) >= today)
      .sort((a, b) => normalizeExceptionDate(a.exception_date).localeCompare(normalizeExceptionDate(b.exception_date)))
      .slice(0, 12);
  }, [exceptions]);

  const togglePending = (key) => {
    setPendingKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDayClick = (date) => {
    const key = formatDateKey(date);
    if (rangePickMode) {
      if (!rangeStart) {
        setRangeStart(date);
        toast?.('Выберите конечную дату периода', 'success');
        return;
      }
      const keys = eachDateInRange(rangeStart, date);
      setPendingKeys((prev) => new Set([...prev, ...keys]));
      setRangeStart(null);
      setRangePickMode(false);
      return;
    }
    togglePending(key);
  };

  const applyPending = async () => {
    if (pendingKeys.size === 0) {
      toast?.('Выберите дни на календаре', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/master/me/exceptions/bulk', {
        salonMasterId,
        action: mode === 'remove' ? 'remove' : 'set_closed',
        dates: [...pendingKeys]
      });
      toast?.(mode === 'remove' ? 'Отметки сняты' : 'Выходные сохранены', 'success');
      setPendingKeys(new Set());
      setRangeStart(null);
      onChanged?.();
    } catch (err) {
      toast?.(err.response?.data?.error || 'Не удалось сохранить', 'error');
    } finally {
      setSaving(false);
    }
  };

  const markWeekendsInMonth = () => {
    const y = activeMonth.getFullYear();
    const m = activeMonth.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    const keys = [];
    for (let d = 1; d <= last; d++) {
      const dt = new Date(y, m, d, 12);
      const dow = dt.getDay();
      if (dow === 0 || dow === 6) keys.push(formatDateKey(dt));
    }
    setPendingKeys((prev) => new Set([...prev, ...keys]));
  };

  const clearPending = () => {
    setPendingKeys(new Set());
    setRangeStart(null);
    setRangePickMode(false);
  };

  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    const key = formatDateKey(date);
    const classes = ['schedule-cal-tile'];
    if (holidays.has(key)) classes.push('schedule-cal-holiday');
    const ex = exceptionMap.get(key);
    if (ex) {
      classes.push(ex.is_working ? 'schedule-cal-special' : 'schedule-cal-closed');
    }
    if (pendingKeys.has(key)) {
      classes.push(mode === 'remove' ? 'schedule-cal-pending-remove' : 'schedule-cal-pending-close');
    }
    if (rangeStart && formatDateKey(rangeStart) === key) {
      classes.push('schedule-cal-range-start');
    }
    return classes.join(' ');
  };

  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const key = formatDateKey(date);
    const holiday = holidays.get(key);
    const ex = exceptionMap.get(key);
    if (!holiday && !ex) return null;
    return (
      <span className="schedule-cal-dot" title={holiday || (ex.is_working ? 'Особые часы' : 'Выходной')} />
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Календарь выходных и праздников"
          description="Праздники РФ подсвечены жёлтым. Отметьте дни, когда салон или мастер не работает"
        />

        <div className="mb-4 flex flex-wrap gap-2">
          {Object.values(MODES).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                clearPending();
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === m.id
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-slate-100 text-ink-secondary hover:bg-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p className="mb-3 text-sm text-ink-muted">{MODES[mode].hint}</p>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setRangePickMode(true);
              setRangeStart(null);
              toast?.('Выберите начало и конец периода на календаре', 'success');
            }}
          >
            <CalendarDays className="h-4 w-4" />
            Период с…
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={markWeekendsInMonth}>
            Сб и Вс этого месяца
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const y = activeMonth.getFullYear();
              const m = activeMonth.getMonth();
              const last = new Date(y, m + 1, 0).getDate();
              const keys = [];
              for (let d = 1; d <= last; d++) {
                const key = formatDateKey(new Date(y, m, d, 12));
                if (holidays.has(key)) keys.push(key);
              }
              setPendingKeys((prev) => new Set([...prev, ...keys]));
              if (keys.length === 0) toast?.('В этом месяце нет праздников РФ в календаре', 'error');
            }}
          >
            Праздники РФ в месяце
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clearPending} disabled={pendingKeys.size === 0}>
            <Eraser className="h-4 w-4" />
            Сбросить выбор ({pendingKeys.size})
          </Button>
        </div>

        <div className="schedule-cal-wrap rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4">
          <Calendar
            activeStartDate={activeMonth}
            onActiveStartDateChange={({ activeStartDate }) => activeStartDate && setActiveMonth(activeStartDate)}
            onClickDay={handleDayClick}
            locale="ru-RU"
            tileClassName={tileClassName}
            tileContent={tileContent}
            minDetail="year"
            className="schedule-cal w-full border-0 bg-transparent"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-secondary">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded schedule-cal-legend-holiday" /> Праздник РФ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded schedule-cal-legend-closed" /> Выходной (сохранён)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded schedule-cal-legend-pending" /> Выбрано
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button onClick={applyPending} loading={saving} disabled={pendingKeys.size === 0} className="sm:w-auto w-full">
            <Save className="h-4 w-4" />
            {mode === 'remove' ? 'Снять отметку с выбранных' : 'Сохранить выходные'}
            {pendingKeys.size > 0 ? ` (${pendingKeys.size})` : ''}
          </Button>
          {rangePickMode && (
            <p className="text-sm text-ink-muted">
              {rangeStart
                ? `Начало: ${rangeStart.toLocaleDateString('ru-RU')} — выберите конечную дату`
                : 'Режим периода: выберите первую дату'}
            </p>
          )}
        </div>
      </Card>

      {upcoming.length > 0 && (
        <Card>
          <CardHeader title="Ближайшие исключения" description="Уже сохранённые выходные и особые дни" />
          <ul className="divide-y divide-slate-100">
            {upcoming.map((ex) => {
              const key = normalizeExceptionDate(ex.exception_date);
              const holiday = holidays.get(key);
              return (
                <li key={ex.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {new Date(key).toLocaleDateString('ru-RU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-ink-secondary">
                      {ex.is_working ? `Рабочий: ${ex.start_time?.slice(0, 5)}–${ex.end_time?.slice(0, 5)}` : 'Выходной / закрыто'}
                      {holiday ? ` · ${holiday}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!ex.is_working && <Badge tone="neutral">Закрыто</Badge>}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={async () => {
                        try {
                          await api.delete(`/master/me/exceptions/${ex.id}`, {
                            params: { salonMasterId }
                          });
                          toast?.('Удалено', 'success');
                          onChanged?.();
                        } catch {
                          toast?.('Ошибка удаления', 'error');
                        }
                      }}
                    >
                      Удалить
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Calendar, CalendarDays, Clock, Info, Plus, Save, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import { DAYS } from '../../lib/format';
import { getRuHolidays } from '../../lib/ruHolidays';
import { mediaUrl } from '../../lib/media';

function localTodayKey() {
  return new Date().toLocaleDateString('en-CA');
}

function exceptionDateKey(ex) {
  return String(ex.exception_date).slice(0, 10);
}

function DayToggle({ active, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition ${
        active ? 'bg-admin-accent' : 'bg-slate-200'
      }`}
    >
      <span
        className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${
          active ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SectionCard({ title, description, action, children }) {
  return (
    <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div>
          <h2 className="text-base font-bold text-admin-text">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-admin-textMuted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function ScheduleSection({
  scheduleDraft,
  exceptions,
  salonMasters,
  selectedSalonMasterId,
  onMasterChange,
  onDayChange,
  onSave,
  onExceptionDelete,
  onAddException,
  saving
}) {
  const [showExceptions, setShowExceptions] = useState(true);
  const holidays = getRuHolidays(new Date().getFullYear());
  const todayKey = localTodayKey();
  const upcomingExceptions = useMemo(
    () => (exceptions || []).filter((ex) => exceptionDateKey(ex) >= todayKey),
    [exceptions, todayKey]
  );

  const workingDays = scheduleDraft.filter((d) => !d.is_day_off).length;
  const selectedMaster = salonMasters?.find((m) => m.id === selectedSalonMasterId);

  return (
    <div className="overview-shell -mx-1 space-y-4 rounded-[1.75rem] px-1 pb-2">
      <section className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#5B4FCF] via-[#6A5ACD] to-[#4338CA] px-4 py-5 text-white shadow-xl shadow-violet-500/20 sm:px-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Расписание</p>
            <h1 className="mt-1 font-display text-2xl font-bold">
              {workingDays} {workingDays === 1 ? 'рабочий день' : workingDays < 5 ? 'рабочих дня' : 'рабочих дней'}
            </h1>
            <p className="mt-1 text-sm text-white/75">
              {selectedMaster ? selectedMaster.name : 'Недельный график и исключения'}
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>

        {salonMasters && salonMasters.length > 1 ? (
          <div className="relative mt-4 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
            {salonMasters.map((m) => {
              const active = m.id === selectedSalonMasterId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onMasterChange(m.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'bg-white/10 text-white/85 ring-1 ring-white/15 hover:bg-white/20'
                  }`}
                >
                  <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white/20">
                    {m.photo_url ? (
                      <img src={mediaUrl(m.photo_url)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold">{m.name?.[0] || '?'}</span>
                    )}
                  </span>
                  <span className="max-w-[120px] truncate">{m.name}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <SectionCard title="Рабочие дни" description="Включите дни и укажите часы">
        <ul className="overflow-hidden rounded-[1.1rem] ring-1 ring-slate-200/80">
          {scheduleDraft.map((day, index) => {
            const working = !day.is_day_off;
            return (
              <li
                key={day.day_of_week}
                className={`grid grid-cols-[1fr_3rem] items-center gap-x-3 gap-y-2 border-slate-100 px-3 py-3 sm:grid-cols-[7.25rem_3rem_1fr] sm:gap-y-0 sm:px-4 ${
                  index > 0 ? 'border-t' : ''
                } ${working ? 'bg-white' : 'bg-slate-50/80'}`}
              >
                <p className="min-w-0 text-sm font-semibold text-admin-text">{DAYS[day.day_of_week]}</p>

                <div className="flex justify-end sm:justify-center">
                  <DayToggle
                    active={working}
                    label={DAYS[day.day_of_week]}
                    onChange={() => onDayChange(day.day_of_week, { is_day_off: working })}
                  />
                </div>

                {working ? (
                  <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:col-start-3 sm:justify-end">
                    <Clock className="hidden h-4 w-4 shrink-0 text-admin-textMuted sm:block" />
                    <input
                      type="time"
                      value={day.start_time?.slice(0, 5) || '09:00'}
                      onChange={(e) => onDayChange(day.day_of_week, { start_time: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium sm:flex-none"
                    />
                    <span className="shrink-0 text-admin-textMuted">—</span>
                    <input
                      type="time"
                      value={day.end_time?.slice(0, 5) || '18:00'}
                      onChange={(e) => onDayChange(day.day_of_week, { end_time: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium sm:flex-none"
                    />
                  </div>
                ) : (
                  <p className="col-span-2 text-xs font-medium text-admin-textMuted sm:col-span-1 sm:col-start-3 sm:text-right">
                    Выходной
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <Button onClick={onSave} loading={saving} className="mt-4 w-full">
          <Save className="h-4 w-4" />
          Сохранить расписание
        </Button>
      </SectionCard>

      <SectionCard
        title="Исключения и праздники"
        description={
          upcomingExceptions.length
            ? `${upcomingExceptions.length} предстоящих · прошедшие удаляются сами`
            : 'Выходной или короткий день на дату'
        }
        action={
          <Button size="sm" variant="secondary" onClick={onAddException}>
            <Plus className="h-4 w-4" />
            Добавить
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-admin-textMuted">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 ring-1 ring-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Праздник РФ
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 ring-1 ring-red-200">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            Выходной
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 ring-1 ring-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Короткий день
          </span>
        </div>

        <div className="mb-4 flex gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-xs text-sky-900 ring-1 ring-sky-100">
          <Info className="h-4 w-4 shrink-0 text-sky-600" />
          <p>
            Выходной закрывает запись на весь день. Короткий день — только в указанные часы.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowExceptions((v) => !v)}
          className="mb-3 text-xs font-semibold text-admin-accent"
        >
          {showExceptions ? 'Скрыть список' : `Показать список (${upcomingExceptions.length})`}
        </button>

        {showExceptions ? (
          upcomingExceptions.length > 0 ? (
            <ul className="max-h-[280px] space-y-2 overflow-y-auto overscroll-contain">
              {upcomingExceptions.map((ex) => {
                const key = exceptionDateKey(ex);
                const isHoliday = holidays.has(key);
                const tone = isHoliday
                  ? 'bg-amber-50 ring-amber-200/80'
                  : ex.is_working
                    ? 'bg-emerald-50 ring-emerald-200/80'
                    : 'bg-red-50 ring-red-200/80';

                return (
                  <li
                    key={ex.id}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ring-1 ${tone}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-admin-text">
                        {new Date(key).toLocaleDateString('ru-RU', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </p>
                      <p className="mt-0.5 text-xs text-admin-textMuted">
                        {isHoliday ? `${holidays.get(key)} · ` : ''}
                        {ex.is_working
                          ? `Короткий день ${ex.start_time?.slice(0, 5)}–${ex.end_time?.slice(0, 5)}`
                          : 'Выходной — запись закрыта'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onExceptionDelete(ex.id)}
                      className="shrink-0 rounded-lg p-2 text-red-600 transition hover:bg-white/80"
                      aria-label="Удалить исключение"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
              <Calendar className="mx-auto h-8 w-8 text-admin-textMuted/50" />
              <p className="mt-2 text-sm font-medium text-admin-text">Нет исключений</p>
              <p className="mt-1 text-xs text-admin-textMuted">Нажмите «Добавить» для выходного или короткого дня</p>
            </div>
          )
        ) : null}
      </SectionCard>
    </div>
  );
}

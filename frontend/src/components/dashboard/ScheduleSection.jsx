import { useState } from 'react';
import { Calendar, Clock, Save, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { DAYS } from '../../lib/format';
import { getRuHolidays } from '../../lib/ruHolidays';

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
  saving,
  savingException,
  toast
}) {
  const [showExceptions, setShowExceptions] = useState(true);
  const holidays = getRuHolidays(new Date().getFullYear());

  const getDayStyle = (day) => {
    if (day.is_day_off) {
      return 'bg-gray-100 text-gray-500 border-gray-200';
    }
    return 'bg-green-50 text-green-800 border-green-200';
  };

  return (
    <div className="space-y-5">
      {/* Master selector */}
      {salonMasters && salonMasters.length > 0 && (
        <Card>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-admin-text whitespace-nowrap">Мастер:</label>
            <select
              value={selectedSalonMasterId || ''}
              onChange={(e) => onMasterChange(e.target.value)}
              className="flex-1 rounded-xl border border-admin-border bg-white px-3 py-2 text-sm text-admin-text focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20"
            >
              {salonMasters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Weekly schedule */}
      <Card>
        <div className="mb-4 pb-3 border-b border-admin-border">
          <h3 className="font-semibold text-base text-admin-text">Рабочие дни</h3>
          <p className="text-sm text-admin-textSecondary">Включите дни и укажите часы работы</p>
        </div>
        <div className="space-y-3">
          {scheduleDraft.map((day) => (
            <div
              key={day.day_of_week}
              className={`flex flex-col gap-3 rounded-xl border p-4 transition sm:flex-row sm:items-center ${getDayStyle(day)}`}
            >
              <label className="flex items-center gap-3 cursor-pointer min-w-[140px]">
                <input
                  type="checkbox"
                  checked={!day.is_day_off}
                  onChange={(e) => onDayChange(day.day_of_week, { is_day_off: !e.target.checked })}
                  className="h-5 w-5 rounded border-gray-300 text-admin-accent focus:ring-admin-accent"
                />
                <span className="font-semibold text-sm">{DAYS[day.day_of_week]}</span>
              </label>

              {!day.is_day_off ? (
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-admin-textMuted" />
                    <input
                      type="time"
                      value={day.start_time?.slice(0, 5) || '09:00'}
                      onChange={(e) => onDayChange(day.day_of_week, { start_time: e.target.value })}
                      className="rounded-lg border border-admin-border bg-white px-2 py-1.5 text-sm font-medium"
                    />
                  </div>
                  <span className="text-admin-textMuted">—</span>
                  <input
                    type="time"
                    value={day.end_time?.slice(0, 5) || '18:00'}
                    onChange={(e) => onDayChange(day.day_of_week, { end_time: e.target.value })}
                    className="rounded-lg border border-admin-border bg-white px-2 py-1.5 text-sm font-medium"
                  />
                </div>
              ) : (
                <Badge tone="neutral">Выходной</Badge>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-admin-border">
          <Button onClick={onSave} loading={saving} className="w-full">
            <Save className="h-4 w-4" />
            Сохранить расписание
          </Button>
        </div>
      </Card>

      {/* Exceptions section */}
      <Card>
        <button
          type="button"
          onClick={() => setShowExceptions(!showExceptions)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-admin-accent" />
            <div className="text-left">
              <h3 className="font-semibold text-admin-text">Исключения и праздники</h3>
              <p className="text-sm text-admin-textSecondary">
                {exceptions?.length || 0} сохранённых дней • Праздники РФ подсвечены
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onAddException(); }}>
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
            {showExceptions ? (
              <ChevronUp className="h-5 w-5 text-admin-textMuted" />
            ) : (
              <ChevronDown className="h-5 w-5 text-admin-textMuted" />
            )}
          </div>
        </button>

        {showExceptions && (
          <div className="mt-4 pt-4 border-t border-admin-border">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs mb-4 pb-4 border-b border-admin-border">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-amber-100 border border-amber-300" />
                Праздник РФ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-red-100 border border-red-300" />
                Выходной
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-green-100 border border-green-300" />
                Рабочий день
              </span>
            </div>

            {exceptions && exceptions.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {exceptions.map((ex) => {
                  const key = String(ex.exception_date).slice(0, 10);
                  const isHoliday = holidays.has(key);
                  return (
                    <div
                      key={ex.id}
                      className={`flex items-center justify-between rounded-lg border bg-white px-3 py-2 ${
                        isHoliday ? 'border-amber-300 bg-amber-50' : ex.is_working ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm text-admin-text">
                          {new Date(key).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long'
                          })}
                          {key.slice(-4) !== String(new Date().getFullYear()) && ` ${key.slice(0, 4)}`}
                        </p>
                        <p className="text-xs text-admin-textMuted">
                          {isHoliday && `${holidays.get(key)} • `}
                          {ex.is_working
                            ? `Рабочий: ${ex.start_time?.slice(0, 5)}–${ex.end_time?.slice(0, 5)}`
                            : 'Выходной'}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => onExceptionDelete(ex.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-admin-textMuted text-center py-6">
                Нет сохранённых исключений. Нажмите "Добавить" чтобы отметить праздник или выходной.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

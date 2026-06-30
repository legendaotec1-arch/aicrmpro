import { CalendarDays, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';
import ClientAvatar from './ClientAvatar';

export default function OverviewTodayCard({
  appointments,
  onShowAll,
  onOpenAppointment,
  appointmentClientForAvatar
}) {
  const todayAppointments = appointments
    .filter((a) => {
      const d = new Date(a.appointment_time);
      return d.toDateString() === new Date().toDateString() && a.status === 'confirmed';
    })
    .sort((a, b) => new Date(a.appointment_time) - new Date(b.appointment_time));

  return (
    <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-200">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-admin-text">Сегодня</h2>
            <p className="text-xs text-admin-textMuted">
              {todayAppointments.length ? `${todayAppointments.length} записей` : 'Свободный день'}
            </p>
          </div>
        </div>
        <Button size="sm" variant="soft" onClick={onShowAll}>
          Все
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="p-3 sm:p-4">
        {todayAppointments.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-admin-text">Записей нет</p>
            <p className="mt-1 text-xs text-admin-textMuted">Клиенты увидят свободные слоты в вашей ссылке</p>
          </div>
        ) : (
          <ul className="space-y-0">
            {todayAppointments.map((apt, index) => (
              <li key={apt.id} className="relative">
                {index < todayAppointments.length - 1 ? (
                  <span className="absolute bottom-0 left-[1.65rem] top-10 w-px bg-violet-100" aria-hidden />
                ) : null}
                <button
                  type="button"
                  onClick={() => onOpenAppointment(apt)}
                  className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-violet-50/60 active:scale-[0.995]"
                >
                  <div className="relative z-[1] flex w-12 shrink-0 flex-col items-center">
                    <span className="flex h-3 w-3 rounded-full bg-violet-500 ring-4 ring-violet-100" />
                    <span className="mt-2 text-sm font-bold tabular-nums text-violet-700">
                      {new Date(apt.appointment_time).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <ClientAvatar client={appointmentClientForAvatar(apt)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-admin-text">{apt.client_name || 'Клиент'}</p>
                    <p className="truncate text-xs text-admin-textMuted">{apt.service_name}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-admin-textMuted group-hover:text-violet-600" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

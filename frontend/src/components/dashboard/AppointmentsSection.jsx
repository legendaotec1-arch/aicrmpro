import { ChevronRight } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import ClientAvatar from './ClientAvatar';
import { appointmentClientForAvatar, isActiveAppointmentListItem, isAppointmentPastDue } from '../../lib/appointments';

export default function AppointmentsSection({
  appointments,
  onManualBook,
  onOpenDetail,
  onResolve,
  resolvingId
}) {
  const active = appointments
    .filter(isActiveAppointmentListItem)
    .sort((a, b) => new Date(a.appointment_time) - new Date(b.appointment_time));

  if (active.length === 0) {
    return (
      <Card>
        <CardHeader
          title="Записи"
          description="Предстоящие визиты и записи, ожидающие отметки"
          action={<Button onClick={onManualBook}>+ Новая запись</Button>}
        />
        <EmptyState
          icon="◷"
          title="Активных записей нет"
          description="Новые записи появятся после бронирования по ссылке или ручного добавления"
        />
      </Card>
    );
  }

  const groups = {};
  active.forEach((apt) => {
    const day = new Date(apt.appointment_time).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    if (!groups[day]) groups[day] = [];
    groups[day].push(apt);
  });

  return (
    <Card>
      <CardHeader
        title="Записи"
        description="Отметьте визит кнопками «Завершить» или «Не пришёл»"
        action={<Button onClick={onManualBook}>+ Новая запись</Button>}
      />
      <div className="divide-y divide-gray-100">
        {Object.entries(groups).map(([day, dayAppts]) => (
          <div key={day}>
            <div className="sticky top-0 z-10 bg-admin-bg px-4 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-admin-textSecondary">{day}</p>
            </div>
            {dayAppts.map((apt) => {
              const pastDue = isAppointmentPastDue(apt);
              return (
                <div
                  key={apt.id}
                  className={`border-l-4 px-4 py-3 transition ${
                    pastDue
                      ? 'border-l-red-500 bg-red-50/60 hover:bg-red-50'
                      : 'border-l-transparent hover:bg-admin-bg'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(apt)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="w-12 shrink-0 text-center">
                        <p className={`text-sm font-bold ${pastDue ? 'text-red-600' : 'text-admin-accent'}`}>
                          {new Date(apt.appointment_time).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <ClientAvatar client={appointmentClientForAvatar(apt)} size="xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-admin-text">
                          {apt.client_name || 'Гость'}
                        </p>
                        <p className="truncate text-xs text-admin-textMuted">{apt.service_name}</p>
                        {pastDue && (
                          <p className="mt-0.5 text-xs font-medium text-red-600">Время визита прошло</p>
                        )}
                      </div>
                      <ChevronRight size={14} className="shrink-0 text-admin-textMuted sm:hidden" />
                    </button>
                    <div className="flex flex-wrap gap-2 pl-[4.75rem] sm:pl-0 sm:shrink-0">
                      <Button
                        size="sm"
                        loading={resolvingId === `${apt.id}-completed`}
                        onClick={() => onResolve(apt.id, 'completed')}
                      >
                        Завершить
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={resolvingId === `${apt.id}-no_show`}
                        onClick={() => onResolve(apt.id, 'no_show')}
                        className="!border-red-200 !text-red-700 hover:!bg-red-50"
                      >
                        Не пришёл
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

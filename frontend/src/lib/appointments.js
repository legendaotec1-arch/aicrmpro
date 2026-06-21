export function appointmentEndMs(apt) {
  const start = new Date(apt.appointment_time).getTime();
  const duration = Number(apt.duration_minutes) || 60;
  return start + duration * 60 * 1000;
}

/** Подтверждённая запись, время визита уже прошло */
export function isAppointmentPastDue(apt) {
  if (apt.status !== 'confirmed') return false;
  return appointmentEndMs(apt) <= Date.now();
}

/** Показываем в списке «Записи» — только ожидающие визита */
export function isActiveAppointmentListItem(apt) {
  return apt.status === 'confirmed';
}

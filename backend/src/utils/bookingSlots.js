const { getSalonMasterById } = require('./salonMasters');

function generateTimeSlots(startTime, endTime, stepMinutes = 60, baseDateStr) {
  const slots = [];
  const [startHour, startMin] = String(startTime).split(':').map(Number);
  const [endHour, endMin] = String(endTime).split(':').map(Number);
  const step = Math.max(15, parseInt(stepMinutes, 10) || 60);

  const [year, month, day] = String(baseDateStr).split('-').map(Number);
  const current = new Date(year, month - 1, day, startHour, startMin, 0, 0);
  const end = new Date(year, month - 1, day, endHour, endMin, 0, 0);

  while (current < end) {
    slots.push(new Date(current));
    current.setMinutes(current.getMinutes() + step);
  }

  return slots;
}

function formatSlotIso(slotDate) {
  const offset = slotDate.getTimezoneOffset() * 60000;
  return new Date(slotDate.getTime() - offset).toISOString().slice(0, 19) + '+05:00';
}

async function getAvailableSlots(db, {
  salonId,
  salonMasterId,
  date,
  durationMinutes = 60,
  excludeAppointmentId = null
}) {
  if (!date) {
    const err = new Error('Укажите дату');
    err.status = 400;
    throw err;
  }
  if (!salonMasterId) {
    const err = new Error('Укажите мастера');
    err.status = 400;
    throw err;
  }

  const teamMaster = await getSalonMasterById(salonMasterId, salonId);
  if (!teamMaster || !teamMaster.is_active) {
    const err = new Error('Мастер не найден');
    err.status = 404;
    throw err;
  }

  const serviceDuration = Math.max(15, parseInt(durationMinutes, 10) || 60);
  const stepMinutes = teamMaster.slot_step_minutes || 60;
  const dateStr = String(date).split('T')[0];
  const dayOfWeek = new Date(`${dateStr}T12:00:00`).getDay();

  const schedule = await db.query(
    `SELECT * FROM work_schedule
     WHERE salon_master_id = $1 AND day_of_week = $2 AND is_day_off = false`,
    [salonMasterId, dayOfWeek]
  );

  if (schedule.rows.length === 0) {
    return [];
  }

  const { start_time, end_time } = schedule.rows[0];

  const exception = await db.query(
    `SELECT * FROM schedule_exceptions
     WHERE salon_master_id = $1 AND TO_CHAR(exception_date, 'YYYY-MM-DD') = $2`,
    [salonMasterId, dateStr]
  );

  if (exception.rows.length > 0 && !exception.rows[0].is_working) {
    return [];
  }

  const exceptionStartTime = exception.rows[0]?.start_time;
  const exceptionEndTime = exception.rows[0]?.end_time;

  const slots = generateTimeSlots(
    exceptionStartTime || start_time,
    exceptionEndTime || end_time,
    stepMinutes,
    dateStr
  );

  const booked = await db.query(
    `SELECT appointment_time, duration_minutes FROM appointments
     WHERE salon_master_id = $1 AND DATE(appointment_time) = $2 AND status = 'confirmed'
       AND ($3::uuid IS NULL OR id != $3::uuid)`,
    [salonMasterId, dateStr, excludeAppointmentId]
  );

  const now = Date.now();
  const freeSlots = slots.filter((slot) => {
    const slotStart = slot.getTime();
    const slotEnd = slotStart + serviceDuration * 60000;
    if (slotStart < now) return false;
    return !booked.rows.some((b) => {
      const bookedStart = new Date(b.appointment_time).getTime();
      const bookedEnd = bookedStart + (b.duration_minutes || 60) * 60000;
      return slotStart < bookedEnd && slotEnd > bookedStart;
    });
  });

  return freeSlots.map(formatSlotIso);
}

module.exports = { generateTimeSlots, formatSlotIso, getAvailableSlots };

const { getSalonMasterById } = require('./salonMasters');
const { getSalonTimezone } = require('./salonTimezone');
const { dayOfWeekFromDateStr, formatSalonIso, parseSalonIso } = require('./salonTime');

function generateTimeSlots(startTime, endTime, stepMinutes, dateStr, timeZone) {
  const slots = [];
  const [startHour, startMin] = String(startTime).split(':').map(Number);
  const [endHour, endMin] = String(endTime).split(':').map(Number);
  const step = Math.max(15, parseInt(stepMinutes, 10) || 60);

  let hour = startHour;
  let minute = startMin;
  const endTotal = endHour * 60 + endMin;

  while (hour * 60 + minute < endTotal) {
    slots.push(formatSalonIso(dateStr, hour, minute, timeZone));
    minute += step;
    while (minute >= 60) {
      minute -= 60;
      hour += 1;
    }
  }

  return { slots, endHour, endMin };
}

function formatSlotIso(slotIso) {
  return slotIso;
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

  const timeZone = await getSalonTimezone(db, salonId);

  const teamMaster = await getSalonMasterById(salonMasterId, salonId);
  if (!teamMaster || !teamMaster.is_active) {
    const err = new Error('Мастер не найден');
    err.status = 404;
    throw err;
  }

  const serviceDuration = Math.max(15, parseInt(durationMinutes, 10) || 60);
  const stepMinutes = teamMaster.slot_step_minutes || 60;
  const dateStr = String(date).split('T')[0];
  const dayOfWeek = dayOfWeekFromDateStr(dateStr);

  const exception = await db.query(
    `SELECT * FROM schedule_exceptions
     WHERE salon_master_id = $1 AND TO_CHAR(exception_date, 'YYYY-MM-DD') = $2`,
    [salonMasterId, dateStr]
  );
  const ex = exception.rows[0];

  if (ex && !ex.is_working) {
    return [];
  }

  const schedule = await db.query(
    `SELECT * FROM work_schedule
     WHERE salon_master_id = $1 AND day_of_week = $2`,
    [salonMasterId, dayOfWeek]
  );
  const sched = schedule.rows[0];

  let startTime;
  let endTime;

  if (ex && ex.is_working) {
    startTime = ex.start_time;
    endTime = ex.end_time;
    if (!startTime || !endTime) {
      return [];
    }
  } else if (!sched || sched.is_day_off) {
    return [];
  } else {
    startTime = sched.start_time;
    endTime = sched.end_time;
  }

  const { slots, endHour, endMin } = generateTimeSlots(startTime, endTime, stepMinutes, dateStr, timeZone);
  const endOfDayMs = parseSalonIso(formatSalonIso(dateStr, endHour, endMin, timeZone)).getTime();

  const booked = await db.query(
    `SELECT appointment_time, duration_minutes FROM appointments
     WHERE salon_master_id = $1
       AND DATE(appointment_time AT TIME ZONE $3) = $2::date
       AND status = 'confirmed'
       AND ($4::uuid IS NULL OR id != $4::uuid)`,
    [salonMasterId, dateStr, timeZone, excludeAppointmentId]
  );

  const now = Date.now();
  const freeSlots = slots.filter((slotIso) => {
    const slotStart = parseSalonIso(slotIso).getTime();
    const slotEnd = slotStart + serviceDuration * 60000;
    if (slotStart < now) return false;
    if (slotEnd > endOfDayMs) return false;
    return !booked.rows.some((b) => {
      const bookedStart = new Date(b.appointment_time).getTime();
      const bookedEnd = bookedStart + (b.duration_minutes || 60) * 60000;
      return slotStart < bookedEnd && slotEnd > bookedStart;
    });
  });

  return freeSlots;
}

module.exports = { generateTimeSlots, formatSlotIso, getAvailableSlots };

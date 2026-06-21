const { v4: uuidv4 } = require('uuid');
const { todayInTimezone, DEFAULT_SALON_TIMEZONE } = require('./salonTime');

/** Сегодня по Москве (YYYY-MM-DD) — для обратной совместимости */
function mskTodayDateStr() {
  return todayInTimezone('Europe/Moscow');
}

/** Сегодня в указанном часовом поясе (YYYY-MM-DD) */
function salonTodayDateStr(timeZone = DEFAULT_SALON_TIMEZONE) {
  return todayInTimezone(timeZone);
}

/** Удаляет исключения с датой раньше сегодня, чтобы список не засорялся */
async function cleanupPastScheduleExceptions(db, { salonMasterId = null, timeZone = DEFAULT_SALON_TIMEZONE } = {}) {
  const today = salonTodayDateStr(timeZone);
  const params = [today];
  let sql = 'DELETE FROM schedule_exceptions WHERE exception_date < $1::date';
  if (salonMasterId) {
    params.push(salonMasterId);
    sql += ' AND salon_master_id = $2';
  }
  const result = await db.query(sql, params);
  return result.rowCount || 0;
}

function assertFutureExceptionDate(exception_date, timeZone = DEFAULT_SALON_TIMEZONE) {
  const key = String(exception_date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const err = new Error('Укажите корректную дату');
    err.status = 400;
    throw err;
  }
  if (key < salonTodayDateStr(timeZone)) {
    const err = new Error('Нельзя добавить исключение на прошедшую дату');
    err.status = 400;
    throw err;
  }
  return key;
}

/** Upsert без ON CONFLICT — работает и без uq_schedule_exceptions_team */
async function upsertScheduleException(db, {
  masterId,
  salonMasterId,
  exception_date,
  is_working,
  start_time = null,
  end_time = null,
  timeZone = DEFAULT_SALON_TIMEZONE
}) {
  const dateKey = assertFutureExceptionDate(exception_date, timeZone);

  if (is_working) {
    if (!start_time || !end_time) {
      const err = new Error('Укажите время для короткого рабочего дня');
      err.status = 400;
      throw err;
    }
    if (String(start_time).slice(0, 5) >= String(end_time).slice(0, 5)) {
      const err = new Error('Время «До» должно быть позже «С»');
      err.status = 400;
      throw err;
    }
  }

  const existing = await db.query(
    `SELECT id FROM schedule_exceptions
     WHERE salon_master_id = $1 AND exception_date = $2::date`,
    [salonMasterId, dateKey]
  );

  const working = Boolean(is_working);
  const start = working ? start_time : null;
  const end = working ? end_time : null;

  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE schedule_exceptions
       SET is_working = $1, start_time = $2, end_time = $3
       WHERE id = $4`,
      [working, start, end, existing.rows[0].id]
    );
    return existing.rows[0].id;
  }

  const id = uuidv4();
  await db.query(
    `INSERT INTO schedule_exceptions (id, master_id, salon_master_id, exception_date, is_working, start_time, end_time)
     VALUES ($1, $2, $3, $4::date, $5, $6, $7)`,
    [id, masterId, salonMasterId, dateKey, working, start, end]
  );
  return id;
}

module.exports = {
  mskTodayDateStr,
  salonTodayDateStr,
  cleanupPastScheduleExceptions,
  upsertScheduleException
};

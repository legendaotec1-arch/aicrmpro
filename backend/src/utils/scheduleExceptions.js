const { v4: uuidv4 } = require('uuid');

const MSK_OFFSET_MIN = 180;

/** Сегодня по Москве (YYYY-MM-DD) */
function mskTodayDateStr() {
  const local = new Date(Date.now() + MSK_OFFSET_MIN * 60 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Удаляет исключения с датой раньше сегодня (МСК), чтобы список не засорялся */
async function cleanupPastScheduleExceptions(db, { salonMasterId = null } = {}) {
  const today = mskTodayDateStr();
  const params = [today];
  let sql = 'DELETE FROM schedule_exceptions WHERE exception_date < $1::date';
  if (salonMasterId) {
    params.push(salonMasterId);
    sql += ' AND salon_master_id = $2';
  }
  const result = await db.query(sql, params);
  return result.rowCount || 0;
}

function assertFutureExceptionDate(exception_date) {
  const key = String(exception_date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const err = new Error('Укажите корректную дату');
    err.status = 400;
    throw err;
  }
  if (key < mskTodayDateStr()) {
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
  end_time = null
}) {
  const dateKey = assertFutureExceptionDate(exception_date);

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
  cleanupPastScheduleExceptions,
  upsertScheduleException
};

const { v4: uuidv4 } = require('uuid');

/** Upsert без ON CONFLICT — работает и без uq_schedule_exceptions_team */
async function upsertScheduleException(db, {
  masterId,
  salonMasterId,
  exception_date,
  is_working,
  start_time = null,
  end_time = null
}) {
  const existing = await db.query(
    `SELECT id FROM schedule_exceptions
     WHERE salon_master_id = $1 AND exception_date = $2::date`,
    [salonMasterId, exception_date]
  );

  if (existing.rows.length > 0) {
    await db.query(
      `UPDATE schedule_exceptions
       SET is_working = $1, start_time = $2, end_time = $3
       WHERE id = $4`,
      [is_working, start_time, end_time, existing.rows[0].id]
    );
    return existing.rows[0].id;
  }

  const id = uuidv4();
  console.log('[upsertScheduleException] Inserting:', { masterId, salonMasterId, exception_date, is_working });
  await db.query(
    `INSERT INTO schedule_exceptions (id, master_id, salon_master_id, exception_date, is_working, start_time, end_time)
     VALUES ($1, $2, $3, $4::date, $5, $6, $7)`,
    [id, masterId, salonMasterId, exception_date, is_working, start_time, end_time]
  );
  console.log('[upsertScheduleException] Inserted successfully');
  return id;
}

module.exports = { upsertScheduleException };

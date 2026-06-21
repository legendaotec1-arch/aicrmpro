function hasOverlap(rows, startMs, endMs) {
  return rows.some((b) => {
    const bookedStart = new Date(b.appointment_time).getTime();
    const bookedEnd = bookedStart + (b.duration_minutes || 60) * 60000;
    return startMs < bookedEnd && endMs > bookedStart;
  });
}

async function assertSlotAvailable(client, salonMasterId, appointmentTime, durationMinutes, excludeAppointmentId = null) {
  const startMs = new Date(appointmentTime).getTime();
  const endMs = startMs + durationMinutes * 60000;
  const lockKey = `${salonMasterId}:${Math.floor(startMs / 60000)}`;
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text))', [lockKey]);

  const params = [salonMasterId, appointmentTime];
  let excludeSql = '';
  if (excludeAppointmentId) {
    params.push(excludeAppointmentId);
    excludeSql = ` AND id != $${params.length}`;
  }

  const booked = await client.query(
    `SELECT id, appointment_time, duration_minutes FROM appointments
     WHERE salon_master_id = $1 AND status = 'confirmed'
       AND DATE(appointment_time) = DATE($2::timestamptz)${excludeSql}
     FOR UPDATE`,
    params
  );

  if (hasOverlap(booked.rows, startMs, endMs)) {
    const err = new Error('Время уже занято');
    err.status = 409;
    throw err;
  }
}

async function withBookingTransaction(db, fn) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  assertSlotAvailable,
  withBookingTransaction
};

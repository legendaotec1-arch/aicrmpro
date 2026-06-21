const { normalizeTimezone, DEFAULT_SALON_TIMEZONE } = require('./salonTime');

async function getSalonTimezone(db, salonId) {
  if (!salonId) return DEFAULT_SALON_TIMEZONE;
  const result = await db.query('SELECT timezone FROM masters WHERE id = $1', [salonId]);
  return normalizeTimezone(result.rows[0]?.timezone);
}

module.exports = { getSalonTimezone };

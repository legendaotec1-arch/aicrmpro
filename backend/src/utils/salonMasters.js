const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { queryWithColumnFallback } = require('./safeQuery');
const { sanitizeSalonMasterRow } = require('./mediaResolve');

async function listSalonMasters(salonId, { activeOnly = false } = {}) {
  let q = `SELECT * FROM salon_masters WHERE salon_id = $1`;
  if (activeOnly) q += ` AND is_active = TRUE`;
  q += ` ORDER BY sort_order, name`;
  const result = await db.query(q, [salonId]);
  return result.rows.map(sanitizeSalonMasterRow);
}

async function getSalonMasterById(salonMasterId, salonId) {
  const result = await db.query(
    `SELECT * FROM salon_masters WHERE id = $1 AND salon_id = $2`,
    [salonMasterId, salonId]
  );
  return result.rows[0] || null;
}

async function ensureDefaultSalonMaster(salonId, { name = 'Мастер' } = {}) {
  const existing = await db.query(
    `SELECT id FROM salon_masters WHERE salon_id = $1 ORDER BY sort_order LIMIT 1`,
    [salonId]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const id = uuidv4();
  await db.query(
    `INSERT INTO salon_masters (id, salon_id, name, slot_step_minutes, sort_order)
     VALUES ($1, $2, $3, 60, 0)`,
    [id, salonId, name]
  );
  return id;
}

async function getPriceGroupsForSalon(salonId) {
  const masters = await listSalonMasters(salonId, { activeOnly: true });
  const groups = [];

  for (const m of masters) {
    const prices = await queryWithColumnFallback(
      db,
      `SELECT id, name, price, price_max, price_type, duration_minutes, image_url
       FROM price_items
       WHERE salon_master_id = $1 AND is_active = TRUE
       ORDER BY sort_order`,
      `SELECT id, name, price, duration_minutes, image_url
       FROM price_items
       WHERE salon_master_id = $1 AND is_active = TRUE
       ORDER BY sort_order`,
      [m.id]
    );
    groups.push({
      master: {
        id: m.id,
        name: m.name,
        last_name: m.last_name,
        specialty: m.specialty,
        photo_url: m.photo_url,
        description: m.description,
        slot_step_minutes: m.slot_step_minutes
      },
      services: prices.rows
    });
  }

  return groups;
}

module.exports = {
  listSalonMasters,
  getSalonMasterById,
  ensureDefaultSalonMaster,
  getPriceGroupsForSalon
};

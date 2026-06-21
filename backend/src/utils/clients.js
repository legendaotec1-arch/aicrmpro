const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const VALID_CHANNELS = ['max', 'telegram'];

function normalizeChannel(channel) {
  const ch = (channel || 'max').toLowerCase();
  return VALID_CHANNELS.includes(ch) ? ch : 'max';
}

async function findOrCreateClient({ channel, maxUserId, telegramUserId, name, phone, photoUrl }) {
  const messenger = normalizeChannel(channel);

  if (messenger === 'max' && maxUserId) {
    const existing = await db.query('SELECT id, name, phone, photo_url FROM clients WHERE max_user_id = $1', [maxUserId]);
    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      if (name) {
        await db.query('UPDATE clients SET name = COALESCE(NULLIF(name, \'\'), $1) WHERE id = $2', [name, id]);
      }
      if (phone) {
        await db.query('UPDATE clients SET phone = COALESCE(NULLIF(phone, \'\'), $1) WHERE id = $2', [phone, id]);
      }
      if (photoUrl && !existing.rows[0].photo_url) {
        await db.query('UPDATE clients SET photo_url = $1 WHERE id = $2', [photoUrl, id]);
      }
      return id;
    }
  }

  if (messenger === 'telegram' && telegramUserId) {
    const existing = await db.query('SELECT id, name, phone, photo_url FROM clients WHERE telegram_user_id = $1', [telegramUserId]);
    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      if (name) {
        await db.query('UPDATE clients SET name = COALESCE(NULLIF(name, \'\'), $1) WHERE id = $2', [name, id]);
      }
      if (phone) {
        await db.query('UPDATE clients SET phone = COALESCE(NULLIF(phone, \'\'), $1) WHERE id = $2', [phone, id]);
      }
      if (photoUrl && !existing.rows[0].photo_url) {
        await db.query('UPDATE clients SET photo_url = $1 WHERE id = $2', [photoUrl, id]);
      }
      return id;
    }
  }

  if (phone) {
    const byPhone = await db.query(
      `SELECT id, photo_url FROM clients
       WHERE phone = $1 AND messenger = $2
       ORDER BY created_at DESC LIMIT 1`,
      [phone, messenger]
    );
    if (byPhone.rows.length > 0) {
      const clientId = byPhone.rows[0].id;
      if (messenger === 'max' && maxUserId) {
        await db.query(
          'UPDATE clients SET max_user_id = COALESCE(max_user_id, $1), name = COALESCE(name, $2), phone = COALESCE(phone, $3) WHERE id = $4',
          [maxUserId, name, phone, clientId]
        );
      }
      if (messenger === 'telegram' && telegramUserId) {
        await db.query(
          'UPDATE clients SET telegram_user_id = COALESCE(telegram_user_id, $1), name = COALESCE(name, $2), phone = COALESCE(phone, $3) WHERE id = $4',
          [telegramUserId, name, phone, clientId]
        );
      }
      if (photoUrl && !byPhone.rows[0].photo_url) {
        await db.query('UPDATE clients SET photo_url = $1 WHERE id = $2', [photoUrl, clientId]);
      }
      return clientId;
    }
  }

  const clientId = uuidv4();
  await db.query(
    `INSERT INTO clients (id, max_user_id, telegram_user_id, messenger, name, phone, photo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      clientId,
      messenger === 'max' ? maxUserId || null : null,
      messenger === 'telegram' ? telegramUserId || null : null,
      messenger,
      name || 'Клиент',
      phone || null,
      photoUrl || null
    ]
  );
  return clientId;
}

async function getClientByMessengerUserId(channel, userId) {
  if (!userId) return null;
  const messenger = normalizeChannel(channel);
  const column = messenger === 'telegram' ? 'telegram_user_id' : 'max_user_id';
  const result = await db.query(`SELECT id FROM clients WHERE ${column} = $1`, [userId]);
  return result.rows[0]?.id || null;
}

async function ensureSalonClientProfile(salonId, clientId) {
  if (!salonId || !clientId) return;
  await db.query(
    `INSERT INTO salon_client_profiles (salon_id, client_id, deleted_at, updated_at)
     VALUES ($1, $2, NULL, NOW())
     ON CONFLICT (salon_id, client_id)
     DO UPDATE SET deleted_at = NULL, updated_at = NOW()`,
    [salonId, clientId]
  );
}

module.exports = {
  normalizeChannel,
  findOrCreateClient,
  getClientByMessengerUserId,
  ensureSalonClientProfile,
  VALID_CHANNELS
};

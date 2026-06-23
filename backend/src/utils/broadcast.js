const db = require('../config/database');

const VALID_CHANNELS = new Set(['all', 'telegram', 'max']);
const VALID_AUDIENCES = new Set(['all', 'inactive', 'selected']);

function channelFilterSql(channel, paramOffset = 1) {
  if (channel === 'telegram') {
    return `c.telegram_user_id IS NOT NULL`;
  }
  if (channel === 'max') {
    return `c.max_user_id IS NOT NULL`;
  }
  return `(c.telegram_user_id IS NOT NULL OR c.max_user_id IS NOT NULL)`;
}

async function fetchBroadcastRecipients(masterId, options = {}) {
  const {
    audience = 'all',
    inactive_days = 30,
    client_ids = [],
    channel = 'all',
  } = options;

  if (!VALID_CHANNELS.has(channel)) {
    const err = new Error('Неверный канал рассылки');
    err.status = 400;
    throw err;
  }
  if (!VALID_AUDIENCES.has(audience)) {
    const err = new Error('Неверный тип аудитории');
    err.status = 400;
    throw err;
  }

  const params = [masterId];
  let audienceSql = '';

  if (audience === 'selected') {
    const ids = Array.isArray(client_ids) ? client_ids.filter(Boolean) : [];
    if (ids.length === 0) {
      const err = new Error('Выберите хотя бы одного клиента');
      err.status = 400;
      throw err;
    }
    params.push(ids);
    audienceSql = `AND c.id = ANY($${params.length})`;
  } else if (audience === 'inactive') {
    const days = Math.max(1, Math.min(365, Number(inactive_days) || 30));
    params.push(days);
    audienceSql = `
      AND (
        (
          SELECT MAX(a2.appointment_time)
          FROM appointments a2
          WHERE a2.client_id = c.id AND a2.master_id = $1 AND a2.status != 'cancelled'
        ) < NOW() - ($${params.length}::int || ' days')::interval
        OR (
          NOT EXISTS (
            SELECT 1 FROM appointments a3
            WHERE a3.client_id = c.id AND a3.master_id = $1 AND a3.status != 'cancelled'
          )
          AND c.created_at < NOW() - ($${params.length}::int || ' days')::interval
        )
      )`;
  }

  const result = await db.query(
    `SELECT DISTINCT c.id, c.name, c.messenger, c.max_user_id, c.telegram_user_id,
            (
              SELECT MAX(a.appointment_time)
              FROM appointments a
              WHERE a.client_id = c.id AND a.master_id = $1 AND a.status != 'cancelled'
            ) AS last_visit
     FROM clients c
     JOIN appointments ap ON ap.client_id = c.id AND ap.master_id = $1
     LEFT JOIN salon_client_profiles scp ON scp.client_id = c.id AND scp.salon_id = $1
     WHERE COALESCE(scp.deleted_at, 'epoch'::timestamp) = 'epoch'::timestamp
       AND ${channelFilterSql(channel)}
       ${audienceSql}
     ORDER BY last_visit DESC NULLS LAST, c.name`,
    params
  );

  return result.rows;
}

module.exports = {
  VALID_CHANNELS,
  VALID_AUDIENCES,
  fetchBroadcastRecipients,
};

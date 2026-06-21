const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { normalizeRuPhoneForStorage, pickBetterPhone } = require('./phoneRu');
const { normalizeTelegramUsername } = require('./messengerLinks');

const VALID_CHANNELS = ['max', 'telegram'];

function normalizeChannel(channel) {
  const ch = (channel || 'max').toLowerCase();
  return VALID_CHANNELS.includes(ch) ? ch : 'max';
}

async function mergeClientPhone(clientId, phone) {
  const better = pickBetterPhone(null, phone);
  if (!better) return;
  const existing = await db.query('SELECT phone FROM clients WHERE id = $1', [clientId]);
  const merged = pickBetterPhone(existing.rows[0]?.phone, better);
  if (merged) {
    await db.query('UPDATE clients SET phone = $1 WHERE id = $2', [merged, clientId]);
  }
}

async function mergeClientTelegramUsername(clientId, username) {
  const normalized = normalizeTelegramUsername(username);
  if (!normalized) return;
  await db.query(
    `UPDATE clients SET telegram_username = COALESCE(NULLIF(telegram_username, ''), $1) WHERE id = $2`,
    [normalized, clientId]
  );
}

function phoneDigitsSql(column) {
  return `NULLIF(regexp_replace(COALESCE(${column}, ''), '\\D', '', 'g'), '')`;
}

async function findClientIdByPhone(phone) {
  const normalized = normalizeRuPhoneForStorage(phone);
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, '');
  if (digits.length < 11) return null;

  const result = await db.query(
    `SELECT id FROM clients
     WHERE ${phoneDigitsSql('phone')} = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [digits]
  );
  return result.rows[0]?.id || null;
}

async function findClientIdBySalonProfilePhone(salonId, phone) {
  const normalized = normalizeRuPhoneForStorage(phone);
  if (!salonId || !normalized) return null;
  const digits = normalized.replace(/\D/g, '');

  const result = await db.query(
    `SELECT c.id
     FROM salon_client_profiles scp
     JOIN clients c ON c.id = scp.client_id
     WHERE scp.salon_id = $1
       AND ${phoneDigitsSql('scp.phone')} = $2
       AND COALESCE(scp.deleted_at, 'epoch'::timestamp) = 'epoch'::timestamp
     ORDER BY scp.updated_at DESC NULLS LAST, c.created_at ASC
     LIMIT 1`,
    [salonId, digits]
  );
  return result.rows[0]?.id || null;
}

async function mergeConversationPair(targetClientId, sourceClientId, salonId) {
  const [targetRes, sourceRes] = await Promise.all([
    db.query(
      'SELECT id, last_message_at FROM conversations WHERE salon_id = $1 AND client_id = $2',
      [salonId, targetClientId]
    ),
    db.query(
      'SELECT id, last_message_at FROM conversations WHERE salon_id = $1 AND client_id = $2',
      [salonId, sourceClientId]
    )
  ]);

  const targetConv = targetRes.rows[0];
  const sourceConv = sourceRes.rows[0];
  if (!sourceConv) return;

  if (!targetConv) {
    await db.query(
      'UPDATE conversations SET client_id = $1 WHERE id = $2',
      [targetClientId, sourceConv.id]
    );
    return;
  }

  await db.query(
    'UPDATE messages SET conversation_id = $1 WHERE conversation_id = $2',
    [targetConv.id, sourceConv.id]
  );

  const lastAt = [targetConv.last_message_at, sourceConv.last_message_at]
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  if (lastAt) {
    await db.query(
      'UPDATE conversations SET last_message_at = $1 WHERE id = $2',
      [lastAt, targetConv.id]
    );
  }

  await db.query('DELETE FROM conversations WHERE id = $1', [sourceConv.id]);
}

async function mergeSalonProfilePair(targetClientId, sourceClientId, salonId) {
  const [targetRes, sourceRes] = await Promise.all([
    db.query(
      `SELECT first_name, last_name, patronymic, phone, notes
       FROM salon_client_profiles
       WHERE salon_id = $1 AND client_id = $2`,
      [salonId, targetClientId]
    ),
    db.query(
      `SELECT first_name, last_name, patronymic, phone, notes
       FROM salon_client_profiles
       WHERE salon_id = $1 AND client_id = $2`,
      [salonId, sourceClientId]
    )
  ]);

  const source = sourceRes.rows[0];
  if (!source) return;

  const target = targetRes.rows[0];
  if (!target) {
    await db.query(
      `UPDATE salon_client_profiles
       SET client_id = $1, deleted_at = NULL, updated_at = NOW()
       WHERE salon_id = $2 AND client_id = $3`,
      [targetClientId, salonId, sourceClientId]
    );
    return;
  }

  const mergedNotes =
    target.notes && source.notes && target.notes.trim() && source.notes.trim()
      ? `${target.notes.trim()}\n---\n${source.notes.trim()}`
      : target.notes?.trim() || source.notes?.trim() || null;

  await db.query(
    `UPDATE salon_client_profiles SET
       first_name = COALESCE(NULLIF($1, ''), first_name),
       last_name = COALESCE(NULLIF($2, ''), last_name),
       patronymic = COALESCE(NULLIF($3, ''), patronymic),
       phone = COALESCE(NULLIF($4, ''), phone),
       notes = $5,
       deleted_at = NULL,
       updated_at = NOW()
     WHERE salon_id = $6 AND client_id = $7`,
    [
      source.first_name,
      source.last_name,
      source.patronymic,
      source.phone,
      mergedNotes,
      salonId,
      targetClientId
    ]
  );

  await db.query(
    'DELETE FROM salon_client_profiles WHERE salon_id = $1 AND client_id = $2',
    [salonId, sourceClientId]
  );
}

/**
 * Переносит все связи с sourceClientId на targetClientId и удаляет дубликат.
 * @param {string} targetClientId — карточка, которую оставляем
 * @param {string} sourceClientId — карточка-дубликат
 */
async function mergeClientsIntoTarget(targetClientId, sourceClientId) {
  if (!targetClientId || !sourceClientId || targetClientId === sourceClientId) {
    return targetClientId;
  }

  await db.query('BEGIN');
  try {
    const [targetRes, sourceRes] = await Promise.all([
      db.query(
        `SELECT id, max_user_id, telegram_user_id, telegram_username, messenger, name, phone, photo_url
         FROM clients WHERE id = $1 FOR UPDATE`,
        [targetClientId]
      ),
      db.query(
        `SELECT id, max_user_id, telegram_user_id, telegram_username, messenger, name, phone, photo_url
         FROM clients WHERE id = $1 FOR UPDATE`,
        [sourceClientId]
      )
    ]);

    if (!targetRes.rows.length || !sourceRes.rows.length) {
      await db.query('ROLLBACK');
      return targetClientId;
    }

    const target = targetRes.rows[0];
    const source = sourceRes.rows[0];

    if (
      target.max_user_id && source.max_user_id &&
      target.max_user_id !== source.max_user_id
    ) {
      throw new Error('Конфликт MAX ID при объединении клиентов');
    }
    if (
      target.telegram_user_id && source.telegram_user_id &&
      target.telegram_user_id !== source.telegram_user_id
    ) {
      throw new Error('Конфликт Telegram ID при объединении клиентов');
    }

    await db.query(
      'UPDATE appointments SET client_id = $1 WHERE client_id = $2',
      [targetClientId, sourceClientId]
    );
    await db.query(
      'UPDATE reviews SET client_id = $1 WHERE client_id = $2',
      [targetClientId, sourceClientId]
    );
    await db.query(
      'UPDATE notifications SET client_id = $1 WHERE client_id = $2',
      [targetClientId, sourceClientId]
    );

    await db.query(
      `DELETE FROM blacklist src
       WHERE src.client_id = $2
         AND EXISTS (
           SELECT 1 FROM blacklist tgt
           WHERE tgt.master_id = src.master_id
             AND tgt.client_id = $1
             AND tgt.salon_master_id IS NOT DISTINCT FROM src.salon_master_id
         )`,
      [targetClientId, sourceClientId]
    );
    await db.query(
      'UPDATE blacklist SET client_id = $1 WHERE client_id = $2',
      [targetClientId, sourceClientId]
    );

    const salonIdsRes = await db.query(
      `SELECT DISTINCT salon_id FROM (
         SELECT salon_id FROM salon_client_profiles WHERE client_id = $1
         UNION
         SELECT salon_id FROM salon_client_profiles WHERE client_id = $2
         UNION
         SELECT salon_id FROM conversations WHERE client_id = $1
         UNION
         SELECT salon_id FROM conversations WHERE client_id = $2
       ) s`,
      [targetClientId, sourceClientId]
    );

    for (const row of salonIdsRes.rows) {
      await mergeSalonProfilePair(targetClientId, sourceClientId, row.salon_id);
      await mergeConversationPair(targetClientId, sourceClientId, row.salon_id);
    }

    await db.query(
      `UPDATE conversations SET client_id = $1 WHERE client_id = $2`,
      [targetClientId, sourceClientId]
    );
    await db.query(
      `UPDATE salon_client_profiles
       SET client_id = $1, deleted_at = NULL, updated_at = NOW()
       WHERE client_id = $2`,
      [targetClientId, sourceClientId]
    );

    const mergedPhone = pickBetterPhone(target.phone, source.phone);
    const mergedName =
      (target.name && target.name.trim() && target.name !== 'Клиент' && target.name !== 'Гость')
        ? target.name
        : (source.name || target.name);

    await db.query(
      `UPDATE clients SET
         max_user_id = COALESCE(max_user_id, $1),
         telegram_user_id = COALESCE(telegram_user_id, $2),
         telegram_username = COALESCE(NULLIF(telegram_username, ''), $3),
         name = COALESCE(NULLIF($4, ''), name),
         phone = COALESCE($5, phone),
         photo_url = COALESCE(photo_url, $6)
       WHERE id = $7`,
      [
        source.max_user_id,
        source.telegram_user_id,
        source.telegram_username,
        mergedName,
        mergedPhone,
        source.photo_url,
        targetClientId
      ]
    );

    await db.query('DELETE FROM clients WHERE id = $1', [sourceClientId]);

    await db.query('COMMIT');
    console.log('[mergeClientsIntoTarget]', { targetClientId, sourceClientId });
    return targetClientId;
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('[mergeClientsIntoTarget] failed:', error.message, { targetClientId, sourceClientId });
    throw error;
  }
}

async function dedupeClientByPhone(salonId, clientId, phone) {
  const normalized = normalizeRuPhoneForStorage(phone);
  if (!normalized || !clientId) return clientId;

  const others = await db.query(
    `SELECT DISTINCT c.id
     FROM clients c
     LEFT JOIN salon_client_profiles scp
       ON scp.client_id = c.id
      AND ($2::uuid IS NULL OR scp.salon_id = $2)
     WHERE c.id != $1
       AND (
         ${phoneDigitsSql('c.phone')} = $3
         OR (
           ${phoneDigitsSql('scp.phone')} = $3
           AND COALESCE(scp.deleted_at, 'epoch'::timestamp) = 'epoch'::timestamp
         )
       )`,
    [clientId, salonId || null, normalized.replace(/\D/g, '')]
  );

  let keepId = clientId;
  for (const row of others.rows) {
    keepId = await mergeClientsIntoTarget(keepId, row.id);
  }
  return keepId;
}

async function enrichClientRecord(clientId, {
  maxUserId,
  telegramUserId,
  name,
  storedPhone,
  photoUrl,
  telegramUsername
}) {
  if (name) {
    await db.query(
      `UPDATE clients SET name = COALESCE(NULLIF(name, ''), $1) WHERE id = $2`,
      [name.trim(), clientId]
    );
  }
  if (maxUserId) {
    await db.query(
      'UPDATE clients SET max_user_id = COALESCE(max_user_id, $1) WHERE id = $2',
      [maxUserId, clientId]
    );
  }
  if (telegramUserId) {
    await db.query(
      'UPDATE clients SET telegram_user_id = COALESCE(telegram_user_id, $1) WHERE id = $2',
      [telegramUserId, clientId]
    );
  }
  if (storedPhone) await mergeClientPhone(clientId, storedPhone);
  if (telegramUsername) await mergeClientTelegramUsername(clientId, telegramUsername);
  if (photoUrl) {
    await db.query(
      'UPDATE clients SET photo_url = COALESCE(photo_url, $1) WHERE id = $2',
      [photoUrl, clientId]
    );
  }
}

async function upsertSalonClientContact(salonId, clientId, { phone, name, telegramUsername } = {}) {
  if (!salonId || !clientId) return clientId;

  await ensureSalonClientProfile(salonId, clientId);

  const normalizedPhone = normalizeRuPhoneForStorage(phone);
  if (normalizedPhone) {
    await db.query(
      `INSERT INTO salon_client_profiles (salon_id, client_id, phone, deleted_at, updated_at)
       VALUES ($1, $2, $3, NULL, NOW())
       ON CONFLICT (salon_id, client_id)
       DO UPDATE SET
         phone = EXCLUDED.phone,
         deleted_at = NULL,
         updated_at = NOW()`,
      [salonId, clientId, normalizedPhone]
    );
    await mergeClientPhone(clientId, normalizedPhone);
    clientId = await dedupeClientByPhone(salonId, clientId, normalizedPhone);
  }

  if (name?.trim()) {
    await db.query(
      `UPDATE clients SET name = COALESCE(NULLIF(name, ''), $1) WHERE id = $2`,
      [name.trim(), clientId]
    );
  }

  if (telegramUsername) {
    await mergeClientTelegramUsername(clientId, telegramUsername);
  }

  return clientId;
}

async function findOrCreateClient({
  channel,
  maxUserId,
  telegramUserId,
  name,
  phone,
  photoUrl,
  telegramUsername,
  salonId
}) {
  const messenger = normalizeChannel(channel);
  const storedPhone = normalizeRuPhoneForStorage(phone);

  let clientId = null;

  if (messenger === 'max' && maxUserId) {
    clientId = await getClientByMessengerUserId('max', maxUserId);
  } else if (messenger === 'telegram' && telegramUserId) {
    clientId = await getClientByMessengerUserId('telegram', telegramUserId);
  }

  let phoneClientId = null;
  if (storedPhone) {
    phoneClientId = await findClientIdByPhone(storedPhone);
    if (!phoneClientId && salonId) {
      phoneClientId = await findClientIdBySalonProfilePhone(salonId, storedPhone);
    }
  }

  if (clientId && phoneClientId && clientId !== phoneClientId) {
    clientId = await mergeClientsIntoTarget(clientId, phoneClientId);
  } else if (!clientId && phoneClientId) {
    clientId = phoneClientId;
  }

  if (clientId) {
    await enrichClientRecord(clientId, {
      maxUserId: messenger === 'max' ? maxUserId : null,
      telegramUserId: messenger === 'telegram' ? telegramUserId : null,
      name,
      storedPhone,
      photoUrl,
      telegramUsername
    });
    if (salonId && storedPhone) {
      clientId = await dedupeClientByPhone(salonId, clientId, storedPhone);
    }
    return clientId;
  }

  const newClientId = uuidv4();
  await db.query(
    `INSERT INTO clients (id, max_user_id, telegram_user_id, messenger, name, phone, photo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      newClientId,
      messenger === 'max' ? maxUserId || null : null,
      messenger === 'telegram' ? telegramUserId || null : null,
      messenger,
      name || 'Клиент',
      storedPhone,
      photoUrl || null
    ]
  );
  if (telegramUsername) await mergeClientTelegramUsername(newClientId, telegramUsername);

  if (salonId && storedPhone) {
    return dedupeClientByPhone(salonId, newClientId, storedPhone);
  }
  return newClientId;
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
  upsertSalonClientContact,
  mergeClientPhone,
  mergeClientTelegramUsername,
  mergeClientsIntoTarget,
  dedupeClientByPhone,
  VALID_CHANNELS
};

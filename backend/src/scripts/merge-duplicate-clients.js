/**
 * Нормализует телефоны и объединяет дубликаты клиентов.
 * Запуск: node src/scripts/merge-duplicate-clients.js
 */
const db = require('../config/database');
const { mergeClientsIntoTarget } = require('../utils/clients');
const { normalizeRuPhoneForStorage } = require('../utils/phoneRu');

async function normalizeStoredPhones() {
  const clients = await db.query('SELECT id, phone FROM clients WHERE phone IS NOT NULL AND phone != \'\'');
  let updated = 0;
  for (const row of clients.rows) {
    const normalized = normalizeRuPhoneForStorage(row.phone);
    if (normalized && normalized !== row.phone) {
      await db.query('UPDATE clients SET phone = $1 WHERE id = $2', [normalized, row.id]);
      updated += 1;
    }
  }

  const profiles = await db.query(
    `SELECT salon_id, client_id, phone FROM salon_client_profiles
     WHERE phone IS NOT NULL AND phone != ''`
  );
  for (const row of profiles.rows) {
    const normalized = normalizeRuPhoneForStorage(row.phone);
    if (normalized && normalized !== row.phone) {
      await db.query(
        'UPDATE salon_client_profiles SET phone = $1 WHERE salon_id = $2 AND client_id = $3',
        [normalized, row.salon_id, row.client_id]
      );
      updated += 1;
    }
  }

  console.log(`Normalized ${updated} phone value(s)`);
}

async function findDuplicateGroups() {
  const byClientPhone = await db.query(
    `SELECT regexp_replace(phone, '\\D', '', 'g') AS digits,
            array_agg(id ORDER BY created_at ASC) AS ids
     FROM clients
     WHERE phone IS NOT NULL AND phone != ''
       AND length(regexp_replace(phone, '\\D', '', 'g')) >= 11
     GROUP BY digits
     HAVING COUNT(*) > 1`
  );

  const byProfilePhone = await db.query(
    `SELECT regexp_replace(scp.phone, '\\D', '', 'g') AS digits,
            array_agg(c.id ORDER BY c.created_at ASC) AS ids
     FROM salon_client_profiles scp
     JOIN clients c ON c.id = scp.client_id
     WHERE scp.phone IS NOT NULL AND scp.phone != ''
       AND COALESCE(scp.deleted_at, 'epoch'::timestamp) = 'epoch'::timestamp
       AND length(regexp_replace(scp.phone, '\\D', '', 'g')) >= 11
     GROUP BY digits
     HAVING COUNT(DISTINCT c.id) > 1`
  );

  const groups = new Map();

  for (const row of [...byClientPhone.rows, ...byProfilePhone.rows]) {
    const ids = [...new Set(row.ids.filter(Boolean))];
    if (ids.length < 2) continue;
    const key = ids.sort().join(',');
    groups.set(key, ids);
  }

  return [...groups.values()];
}

async function main() {
  await normalizeStoredPhones();
  const groups = await findDuplicateGroups();
  console.log(`Found ${groups.length} duplicate group(s)`);

  let merged = 0;
  for (const ids of groups) {
    const [targetId, ...sources] = ids;
    for (const sourceId of sources) {
      try {
        await mergeClientsIntoTarget(targetId, sourceId);
        merged += 1;
        console.log(`Merged ${sourceId} -> ${targetId}`);
      } catch (err) {
        console.error(`Skip ${sourceId} -> ${targetId}:`, err.message);
      }
    }
  }

  console.log(`Done. Merged ${merged} duplicate client(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

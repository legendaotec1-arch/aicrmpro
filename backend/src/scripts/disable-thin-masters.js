/**
 * Отключает индексацию для мастеров с тонкими страницами:
 * пустое/короткое description, нет города, нет адреса.
 *
 * Если мастер потом заполнит данные — флаг public_indexable можно
 * вернуть в true вручную (или автоматически через триггер).
 *
 * Использование: docker exec crm_max_backend node /app/src/scripts/disable-thin-masters.js
 */
require('dotenv').config();
const db = require('../config/database');

async function main() {
  // 1) Находим тонких мастеров
  const r = await db.query(`
    SELECT id, public_slug, name, description, city, address, public_indexable
    FROM masters
    WHERE public_indexable = TRUE
      AND (
        description IS NULL
        OR LENGTH(description) < 50
        OR city IS NULL
        OR LENGTH(city) = 0
      )
  `);
  console.log(`[thin-masters] found ${r.rows.length} masters with thin content:`);
  r.rows.forEach(row => {
    console.log(` - ${row.public_slug} (${row.name}) | desc:${(row.description || '').length} city:${row.city || '-'} addr:${(row.address || '').length}`);
  });

  if (!r.rows.length) {
    console.log('[thin-masters] nothing to update');
    await db.end();
    process.exit(0);
  }

  // 2) Отключаем индексацию
  const ids = r.rows.map((r) => r.id);
  const upd = await db.query(
    `UPDATE masters
     SET public_indexable = FALSE
     WHERE id = ANY($1::uuid[])
     RETURNING public_slug`,
    [ids]
  );
  console.log(`[thin-masters] set public_indexable = FALSE for ${upd.rows.length} masters`);

  // 3) Дёргаем пересборку sitemap, чтобы поисковик увидел изменения
  console.log('[thin-masters] sitemap will be regenerated on next request');

  await db.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});

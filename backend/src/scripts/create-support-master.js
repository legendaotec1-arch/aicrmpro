/**
 * Создаёт или обновляет демо-аккаунт мастера для поддержки (ЮKassa и т.п.).
 * Учётные данные — только в .env: SUPPORT_MASTER_EMAIL, SUPPORT_MASTER_PASSWORD.
 *
 *   npm run support:master
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { ensureDefaultSalonMaster } = require('../utils/salonMasters');

const EMAIL = (process.env.SUPPORT_MASTER_EMAIL || '').trim().toLowerCase();
const PASSWORD = process.env.SUPPORT_MASTER_PASSWORD || '';
const NAME = (process.env.SUPPORT_MASTER_NAME || 'Демо поддержка').trim();
const SALON = (process.env.SUPPORT_MASTER_SALON || 'Тестовый салон (демо)').trim();

async function seedDemoContent(masterId, salonMasterId) {
  const priceCount = await db.query(
    'SELECT COUNT(*)::int AS c FROM price_items WHERE master_id = $1',
    [masterId]
  );
  if (priceCount.rows[0].c === 0) {
    await db.query(
      `INSERT INTO price_items (id, master_id, salon_master_id, name, price, duration_minutes, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 0, TRUE)`,
      [uuidv4(), masterId, salonMasterId, 'Демо-услуга', 500, 30]
    );
    console.log('  + демо-услуга в прайсе');
  }

  await db.query(
    `UPDATE masters SET
       description = COALESCE(NULLIF(description, ''), $2),
       balance = GREATEST(COALESCE(balance, 0), 500),
       updated_at = NOW()
     WHERE id = $1`,
    [
      masterId,
      'Демо-аккаунт для проверки кабинета и раздела «Оплата». Не использовать для реальных клиентов.'
    ]
  );
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('Задайте SUPPORT_MASTER_EMAIL и SUPPORT_MASTER_PASSWORD в .env');
    process.exit(1);
  }
  if (PASSWORD.length < 8) {
    console.error('SUPPORT_MASTER_PASSWORD должен быть не короче 8 символов');
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(PASSWORD, 10);
  const existing = await db.query('SELECT id FROM masters WHERE email = $1', [EMAIL]);

  let masterId;
  if (existing.rows.length > 0) {
    masterId = existing.rows[0].id;
    await db.query(
      `UPDATE masters SET password_hash = $1, name = $2, salon_name = $3, updated_at = NOW() WHERE id = $4`,
      [password_hash, NAME, SALON, masterId]
    );
    console.log(`Обновлён демо-мастер: ${EMAIL} (${masterId})`);
  } else {
    masterId = uuidv4();
    await db.query(
      `INSERT INTO masters (id, email, password_hash, name, salon_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [masterId, EMAIL, password_hash, NAME, SALON]
    );
    console.log(`Создан демо-мастер: ${EMAIL} (${masterId})`);
  }

  const salonMasterId = await ensureDefaultSalonMaster(masterId, { name: NAME });
  await seedDemoContent(masterId, salonMasterId);

  console.log('Готово. Вход: /login → email и пароль из SUPPORT_MASTER_* в .env');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

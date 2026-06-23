const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { sendMail, isEmailConfigured } = require('./email');

const CODE_TTL_MINUTES = 15;

async function ensureMasterEmailSchema() {
  try {
    await db.query('SELECT 1 FROM master_email_codes LIMIT 1');
  } catch {
    const sqlPath = path.join(__dirname, '../db/migrations/041_master_email_auth.sql');
    await db.query(fs.readFileSync(sqlPath, 'utf8'));
  }
}

function generateVerificationCode() {
  return String(crypto.randomInt(100000, 999999));
}

function randomPasswordHash() {
  return bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
}

async function findMasterAccountByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return null;

  const ownerRes = await db.query(
    'SELECT id, email, name, last_name, salon_name, logo_url FROM masters WHERE LOWER(email) = $1',
    [normalized]
  );
  if (ownerRes.rows.length) {
    return { role: 'owner', master: ownerRes.rows[0] };
  }

  const teamRes = await db.query(
    `SELECT sm.*, m.salon_name, m.logo_url AS salon_logo
     FROM salon_masters sm
     JOIN masters m ON m.id = sm.salon_id
     WHERE LOWER(sm.email) = LOWER($1) AND sm.is_active = TRUE`,
    [normalized]
  );
  if (teamRes.rows.length) {
    return { role: 'team', team: teamRes.rows[0] };
  }

  return null;
}

async function sendMasterVerificationCode(email, { purpose, payload = null }) {
  const code = generateVerificationCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
  const normalized = String(email).trim().toLowerCase();

  await db.query(
    `INSERT INTO master_email_codes (email, purpose, payload, code_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [normalized, purpose, payload ? JSON.stringify(payload) : null, codeHash, expiresAt.toISOString()]
  );

  const actionLabel = purpose === 'register' ? 'регистрации в Woner.ru' : 'входа в кабинет мастера Woner.ru';

  const sent = await sendMail({
    to: normalized,
    subject: `Woner.ru — код для ${purpose === 'register' ? 'регистрации' : 'входа'}`,
    text: [
      'Здравствуйте!',
      '',
      `Ваш код для ${actionLabel}: ${code}`,
      `Код действует ${CODE_TTL_MINUTES} минут.`,
      '',
      'Если вы не запрашивали код — проигнорируйте это письмо.',
      '',
      'С уважением, команда Woner.ru',
    ].join('\n'),
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#7c3aed;margin:0 0 16px">Код подтверждения</h2>
        <p style="color:#334155;line-height:1.5">Код для ${actionLabel}:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#1e293b;margin:24px 0">${code}</p>
        <p style="color:#64748b;font-size:14px">Код действует ${CODE_TTL_MINUTES} минут.</p>
      </div>`,
  });

  return {
    sent,
    devCode: process.env.NODE_ENV !== 'production' ? code : (sent ? undefined : code),
    smtpConfigured: isEmailConfigured(),
  };
}

async function verifyMasterEmailCode(email, code) {
  const normalized = String(email).trim().toLowerCase();
  const res = await db.query(
    `SELECT id, purpose, payload, code_hash, expires_at, used_at
     FROM master_email_codes
     WHERE LOWER(email) = LOWER($1)
     ORDER BY created_at DESC
     LIMIT 10`,
    [normalized]
  );

  const now = Date.now();
  for (const row of res.rows) {
    if (row.used_at) continue;
    if (new Date(row.expires_at).getTime() < now) continue;
    const ok = await bcrypt.compare(String(code).trim(), row.code_hash);
    if (!ok) continue;

    await db.query('UPDATE master_email_codes SET used_at = NOW() WHERE id = $1', [row.id]);
    return {
      purpose: row.purpose,
      payload: row.payload ? (typeof row.payload === 'object' ? row.payload : JSON.parse(row.payload)) : null,
    };
  }

  return null;
}

module.exports = {
  CODE_TTL_MINUTES,
  ensureMasterEmailSchema,
  findMasterAccountByEmail,
  sendMasterVerificationCode,
  verifyMasterEmailCode,
  randomPasswordHash,
};

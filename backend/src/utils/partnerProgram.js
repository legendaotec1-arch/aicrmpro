const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { sendMail } = require('./email');

const COMMISSION_PERCENT = Number(process.env.PARTNER_COMMISSION_PERCENT) || 30;
const CODE_TTL_MINUTES = 15;
const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'https://woner.ru').replace(/\/$/, '');

async function ensurePartnerSchema() {
  try {
    await db.query('SELECT 1 FROM partners LIMIT 1');
  } catch {
    const sqlPath = path.join(__dirname, '../db/migrations/040_partner_program.sql');
    await db.query(fs.readFileSync(sqlPath, 'utf8'));
  }
  try {
    await db.query('SELECT 1 FROM partner_post_templates LIMIT 1');
  } catch {
    const sqlPath = path.join(__dirname, '../db/migrations/042_partner_post_templates.sql');
    await db.query(fs.readFileSync(sqlPath, 'utf8'));
  }
}

const MAX_PARTNER_POST_TEMPLATES = 10;

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
}

async function uniqueReferralCode() {
  for (let i = 0; i < 20; i++) {
    const code = generateReferralCode();
    const exists = await db.query('SELECT id FROM partners WHERE referral_code = $1', [code]);
    if (!exists.rows.length) return code;
  }
  throw new Error('Не удалось сгенерировать реферальный код');
}

function generateVerificationCode() {
  return String(crypto.randomInt(100000, 999999));
}

async function sendPartnerVerificationCode(partnerId, email) {
  const code = generateVerificationCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await db.query(
    `INSERT INTO partner_email_codes (partner_id, email, code_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [partnerId, email, codeHash, expiresAt.toISOString()]
  );

  const sent = await sendMail({
    to: email,
    subject: 'Woner.ru — код подтверждения партнёрского кабинета',
    text: [
      'Здравствуйте!',
      '',
      `Ваш код подтверждения: ${code}`,
      `Код действует ${CODE_TTL_MINUTES} минут.`,
      '',
      'Если вы не регистрировались в партнёрской программе Woner.ru — проигнорируйте это письмо.',
      '',
      'С уважением, команда Woner.ru',
    ].join('\n'),
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#7c3aed;margin:0 0 16px">Подтверждение email</h2>
        <p style="color:#334155;line-height:1.5">Код для входа в партнёрский кабинет Woner.ru:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#1e293b;margin:24px 0">${code}</p>
        <p style="color:#64748b;font-size:14px">Код действует ${CODE_TTL_MINUTES} минут.</p>
      </div>`,
  });

  return { sent, devCode: process.env.NODE_ENV !== 'production' ? code : (sent ? undefined : code) };
}

async function verifyPartnerEmailCode(partnerId, code) {
  const res = await db.query(
    `SELECT id, code_hash, expires_at, used_at FROM partner_email_codes
     WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 5`,
    [partnerId]
  );

  const now = Date.now();
  for (const row of res.rows) {
    if (row.used_at) continue;
    if (new Date(row.expires_at).getTime() < now) continue;
    const ok = await bcrypt.compare(String(code).trim(), row.code_hash);
    if (ok) {
      await db.query('UPDATE partner_email_codes SET used_at = NOW() WHERE id = $1', [row.id]);
      await db.query(
        `UPDATE partners SET email_verified = TRUE, updated_at = NOW() WHERE id = $1`,
        [partnerId]
      );
      return true;
    }
  }
  return false;
}

async function findPartnerByReferralCode(code) {
  if (!code) return null;
  const res = await db.query(
    `SELECT id, referral_code, is_active, email_verified FROM partners
     WHERE UPPER(referral_code) = UPPER($1) AND is_active = TRUE AND email_verified = TRUE`,
    [String(code).trim()]
  );
  return res.rows[0] || null;
}

function buildReferralUrl(code) {
  return `${PUBLIC_URL}/register?ref=${encodeURIComponent(code)}`;
}

function buildShortReferralUrl(code) {
  return `${PUBLIC_URL}/r/${encodeURIComponent(code)}`;
}

async function attachMasterToPartner(masterId, referralCode, client = db) {
  const partner = await findPartnerByReferralCode(referralCode);
  if (!partner) return null;
  await client.query(
    `UPDATE masters SET referred_by_partner_id = $1, updated_at = NOW()
     WHERE id = $2 AND referred_by_partner_id IS NULL`,
    [partner.id, masterId]
  );
  return partner.id;
}

async function creditPartnerCommission(client, {
  masterId,
  paymentAmount,
  paymentType,
  billingPaymentId,
  description,
}) {
  const masterRes = await client.query(
    `SELECT referred_by_partner_id FROM masters WHERE id = $1`,
    [masterId]
  );
  const partnerId = masterRes.rows[0]?.referred_by_partner_id;
  if (!partnerId) return null;

  if (billingPaymentId) {
    const dup = await client.query(
      `SELECT id FROM partner_commissions WHERE billing_payment_id = $1`,
      [billingPaymentId]
    );
    if (dup.rows.length) return null;
  }

  const partnerRes = await client.query(
    `SELECT id, commission_percent, balance, total_earned FROM partners WHERE id = $1 AND is_active = TRUE FOR UPDATE`,
    [partnerId]
  );
  const partner = partnerRes.rows[0];
  if (!partner) return null;

  const percent = Number(partner.commission_percent) || COMMISSION_PERCENT;
  const commission = Math.round((Number(paymentAmount) * percent) / 100 * 100) / 100;
  if (commission <= 0) return null;

  const balanceAfter = Number(partner.balance) + commission;
  const earnedAfter = Number(partner.total_earned) + commission;

  await client.query(
    `UPDATE partners SET balance = $1, total_earned = $2, updated_at = NOW() WHERE id = $3`,
    [balanceAfter, earnedAfter, partnerId]
  );

  await client.query(
    `INSERT INTO partner_commissions (
       partner_id, master_id, billing_payment_id, payment_type,
       payment_amount, commission_amount, commission_percent, description
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      partnerId,
      masterId,
      billingPaymentId || null,
      paymentType,
      paymentAmount,
      commission,
      percent,
      description || null,
    ]
  );

  return { partnerId, commission, balanceAfter };
}

async function getPartnerStats(partnerId, { from, to } = {}) {
  const params = [partnerId];
  let dateFilter = '';
  if (from) {
    params.push(from);
    dateFilter += ` AND created_at >= $${params.length}::timestamptz`;
  }
  if (to) {
    params.push(to);
    dateFilter += ` AND created_at <= $${params.length}::timestamptz`;
  }

  const [earnings, referrals, withdrawals] = await Promise.all([
    db.query(
      `SELECT COALESCE(SUM(commission_amount), 0)::numeric AS total,
              COUNT(*)::int AS count
       FROM partner_commissions WHERE partner_id = $1${dateFilter}`,
      params
    ),
    db.query(
      `SELECT COUNT(*)::int AS c FROM masters WHERE referred_by_partner_id = $1`,
      [partnerId]
    ),
    db.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total
       FROM partner_withdrawals WHERE partner_id = $1 AND status = 'completed'${dateFilter.replace(/created_at/g, 'processed_at')}`,
      params
    ),
  ]);

  return {
    earnings: Number(earnings.rows[0]?.total || 0),
    commissionsCount: earnings.rows[0]?.count || 0,
    referrals: referrals.rows[0]?.c || 0,
    withdrawn: Number(withdrawals.rows[0]?.total || 0),
  };
}

async function getPartnerFrozenBalance(partnerId, client = db) {
  const res = await client.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total
     FROM partner_withdrawals WHERE partner_id = $1 AND status = 'pending'`,
    [partnerId]
  );
  return Number(res.rows[0]?.total || 0);
}

async function getPartnerWithdrawalSummary(partnerId, client = db) {
  const res = await client.query(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0)::numeric AS withdrawn,
       COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::numeric AS frozen,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count
     FROM partner_withdrawals WHERE partner_id = $1`,
    [partnerId]
  );
  const row = res.rows[0] || {};
  return {
    withdrawn: Number(row.withdrawn || 0),
    frozen: Number(row.frozen || 0),
    pendingCount: row.pending_count || 0,
  };
}

function maskCardNumber(num) {
  const digits = String(num || '').replace(/\D/g, '');
  if (digits.length < 8) return '****';
  return `${digits.slice(0, 4)} **** **** ${digits.slice(-4)}`;
}

module.exports = {
  COMMISSION_PERCENT,
  PUBLIC_URL,
  ensurePartnerSchema,
  uniqueReferralCode,
  sendPartnerVerificationCode,
  verifyPartnerEmailCode,
  findPartnerByReferralCode,
  buildReferralUrl,
  buildShortReferralUrl,
  attachMasterToPartner,
  creditPartnerCommission,
  getPartnerStats,
  getPartnerFrozenBalance,
  getPartnerWithdrawalSummary,
  maskCardNumber,
  MAX_PARTNER_POST_TEMPLATES,
};

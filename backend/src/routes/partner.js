const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { signPartnerToken, partnerAuthMiddleware } = require('../utils/partnerAuth');
const {
  ensurePartnerSchema,
  uniqueReferralCode,
  sendPartnerVerificationCode,
  verifyPartnerEmailCode,
  buildReferralUrl,
  buildShortReferralUrl,
  getPartnerStats,
  getPartnerWithdrawalSummary,
  COMMISSION_PERCENT,
  PUBLIC_URL,
} = require('../utils/partnerProgram');
const { buildPartnerOfferHtml, PARTNER_MIN_WITHDRAWAL } = require('../partner/partnerOffer');
const { isEmailConfigured } = require('../utils/email');

const router = express.Router();

function partnerPayload(row, extras = {}) {
  const balance = Number(row.balance);
  const frozen = Number(extras.frozen_balance || 0);
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    phone: row.phone,
    referral_code: row.referral_code,
    balance,
    frozen_balance: frozen,
    available_balance: balance,
    total_earned: Number(row.total_earned),
    total_withdrawn: Number(extras.total_withdrawn || 0),
    commission_percent: Number(row.commission_percent),
    email_verified: row.email_verified,
    has_pending_withdrawal: Boolean(extras.has_pending_withdrawal),
  };
}

function periodBounds(period) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === '7d') {
    start.setDate(start.getDate() - 6);
  } else if (period === '30d') {
    start.setDate(start.getDate() - 29);
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

function parseExportBounds(query) {
  const { from, to, month, period } = query;

  if (month && /^\d{4}-\d{2}$/.test(String(month))) {
    const [year, mon] = String(month).split('-').map(Number);
    const start = new Date(year, mon - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, mon, 0, 23, 59, 59, 999);
    const label = start.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    return { from: start.toISOString(), to: end.toISOString(), label, key: month };
  }

  if (from && to) {
    const start = new Date(from);
    const end = new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);
    if (start > end) return null;
    const label = `${start.toLocaleDateString('ru-RU')} — ${end.toLocaleDateString('ru-RU')}`;
    return { from: start.toISOString(), to: end.toISOString(), label, key: `${from}_${to}` };
  }

  const p = period === '1d' ? '1d' : period === '7d' ? '7d' : '30d';
  const bounds = periodBounds(p);
  const labels = { '1d': 'Сегодня', '7d': '7 дней', '30d': '30 дней' };
  return { ...bounds, label: labels[p], key: p };
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function fmtMoneyCsv(n) {
  return Number(n || 0).toFixed(2);
}

router.post('/register', [
  body('email').trim().isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('password').trim().isLength({ min: 6 }),
  body('full_name').trim().notEmpty(),
], async (req, res) => {
  try {
    await ensurePartnerSchema();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, phone } = req.body;
    const exists = await db.query('SELECT id FROM partners WHERE LOWER(email) = LOWER($1)', [email]);
    if (exists.rows.length) {
      return res.status(400).json({ error: 'Партнёр с таким email уже зарегистрирован' });
    }

    const masterExists = await db.query('SELECT id FROM masters WHERE LOWER(email) = LOWER($1)', [email]);
    if (masterExists.rows.length) {
      return res.status(400).json({ error: 'Этот email уже используется в кабинете мастера' });
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);
    const referral_code = await uniqueReferralCode();

    const result = await db.query(
      `INSERT INTO partners (id, email, password_hash, full_name, phone, referral_code)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [id, email, password_hash, full_name.trim(), phone || null, referral_code]
    );
    const partner = result.rows[0];

    const { sent, devCode } = await sendPartnerVerificationCode(partner.id, email);
    if (!sent && process.env.NODE_ENV === 'production' && isEmailConfigured()) {
      return res.status(503).json({ error: 'Не удалось отправить письмо с кодом' });
    }
    if (!sent && process.env.NODE_ENV === 'production' && !isEmailConfigured()) {
      return res.status(503).json({
        error: 'SMTP не настроен. Настройте SMTP_HOST, SMTP_USER, SMTP_PASS в .env',
      });
    }

    res.status(201).json({
      partnerId: partner.id,
      email,
      needsVerification: true,
      message: 'Код подтверждения отправлен на email',
      devCode,
    });
  } catch (err) {
    console.error('Partner register:', err);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

router.post('/verify-email', [
  body('email').trim().isEmail(),
  body('code').trim().isLength({ min: 4, max: 8 }),
], async (req, res) => {
  try {
    const { email, code } = req.body;
    const resPartner = await db.query(
      `SELECT * FROM partners WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    const partner = resPartner.rows[0];
    if (!partner) return res.status(404).json({ error: 'Партнёр не найден' });

    const ok = await verifyPartnerEmailCode(partner.id, code);
    if (!ok) return res.status(400).json({ error: 'Неверный или просроченный код' });

    const updated = await db.query('SELECT * FROM partners WHERE id = $1', [partner.id]);
    const row = updated.rows[0];
    const token = signPartnerToken(row);
    res.json({
      token,
      partner: partnerPayload(row),
      referral_url: buildReferralUrl(row.referral_code),
      short_url: buildShortReferralUrl(row.referral_code),
    });
  } catch (err) {
    console.error('Partner verify:', err);
    res.status(500).json({ error: 'Ошибка подтверждения' });
  }
});

router.post('/resend-code', [
  body('email').trim().isEmail(),
], async (req, res) => {
  try {
    const resPartner = await db.query(
      `SELECT id, email, email_verified FROM partners WHERE LOWER(email) = LOWER($1)`,
      [req.body.email]
    );
    const partner = resPartner.rows[0];
    if (!partner) return res.status(404).json({ error: 'Партнёр не найден' });
    if (partner.email_verified) {
      return res.status(400).json({ error: 'Email уже подтверждён' });
    }
    const { sent, devCode } = await sendPartnerVerificationCode(partner.id, partner.email);
    res.json({ sent, devCode, message: 'Код отправлен повторно' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка отправки кода' });
  }
});

router.post('/login', [
  body('email').trim().isEmail(),
  body('password').trim().notEmpty(),
], async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query(
      `SELECT * FROM partners WHERE LOWER(email) = LOWER($1) AND is_active = TRUE`,
      [email]
    );
    const partner = result.rows[0];
    if (!partner) return res.status(401).json({ error: 'Неверный email или пароль' });

    const match = await bcrypt.compare(password, partner.password_hash);
    if (!match) return res.status(401).json({ error: 'Неверный email или пароль' });

    if (!partner.email_verified) {
      return res.status(403).json({ error: 'Подтвердите email — проверьте почту', needsVerification: true });
    }

    const token = signPartnerToken(partner);
    res.json({
      token,
      partner: partnerPayload(partner),
      referral_url: buildReferralUrl(partner.referral_code),
      short_url: buildShortReferralUrl(partner.referral_code),
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

router.get('/verify', partnerAuthMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM partners WHERE id = $1', [req.partnerId]);
    const partner = result.rows[0];
    if (!partner || !partner.is_active) {
      return res.json({ valid: false });
    }
    res.json({
      valid: true,
      partner: partnerPayload(partner),
      referral_url: buildReferralUrl(partner.referral_code),
      short_url: buildShortReferralUrl(partner.referral_code),
    });
  } catch {
    res.json({ valid: false });
  }
});

router.get('/dashboard', partnerAuthMiddleware, async (req, res) => {
  try {
    const partnerRes = await db.query('SELECT * FROM partners WHERE id = $1', [req.partnerId]);
    const partner = partnerRes.rows[0];
    if (!partner) return res.status(404).json({ error: 'Не найден' });

    const [day, week, month, withdrawalSummary, withdrawalsRes] = await Promise.all([
      getPartnerStats(req.partnerId, periodBounds('1d')),
      getPartnerStats(req.partnerId, periodBounds('7d')),
      getPartnerStats(req.partnerId, periodBounds('30d')),
      getPartnerWithdrawalSummary(req.partnerId),
      db.query(
        `SELECT id, amount, bank_name, full_name, status, created_at, processed_at
         FROM partner_withdrawals WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [req.partnerId]
      ),
    ]);

    const referralsRes = await db.query(
      `SELECT m.id, m.name, m.email, m.salon_name, m.created_at,
              COALESCE(SUM(pc.commission_amount), 0)::numeric AS earned
       FROM masters m
       LEFT JOIN partner_commissions pc ON pc.master_id = m.id AND pc.partner_id = $1
       WHERE m.referred_by_partner_id = $1
       GROUP BY m.id ORDER BY m.created_at DESC LIMIT 50`,
      [req.partnerId]
    );

    res.json({
      partner: partnerPayload(partner, {
        frozen_balance: withdrawalSummary.frozen,
        total_withdrawn: withdrawalSummary.withdrawn,
        has_pending_withdrawal: withdrawalSummary.pendingCount > 0,
      }),
      referral_url: buildReferralUrl(partner.referral_code),
      short_url: buildShortReferralUrl(partner.referral_code),
      commission_percent: COMMISSION_PERCENT,
      min_withdrawal: PARTNER_MIN_WITHDRAWAL,
      stats: { day, week, month },
      referrals: referralsRes.rows.map((r) => ({
        ...r,
        earned: Number(r.earned),
      })),
      withdrawals: withdrawalsRes.rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
      })),
    });
  } catch (err) {
    console.error('Partner dashboard:', err);
    res.status(500).json({ error: 'Ошибка загрузки кабинета' });
  }
});

router.get('/assets', partnerAuthMiddleware, async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, description, file_type, file_name, mime_type, size_bytes, created_at
       FROM partner_assets WHERE is_active = TRUE ORDER BY sort_order, created_at DESC`
    );
    res.json({ assets: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки материалов' });
  }
});

router.get('/post-templates', partnerAuthMiddleware, async (req, res) => {
  try {
    await ensurePartnerSchema();
    const partnerRes = await db.query(
      'SELECT referral_code FROM partners WHERE id = $1',
      [req.partnerId]
    );
    const referralCode = partnerRes.rows[0]?.referral_code;
    const shortUrl = referralCode ? buildShortReferralUrl(referralCode) : '';

    const result = await db.query(
      `SELECT id, title, body, sort_order
       FROM partner_post_templates
       WHERE is_active = TRUE
       ORDER BY sort_order ASC, created_at ASC`
    );

    const templates = result.rows.map((row) => {
      const body = String(row.body)
        .replace(/\{\{referral_link\}\}/gi, shortUrl)
        .replace(/\{\{ссылка\}\}/gi, shortUrl)
        .replace(/\{ссылка\}/gi, shortUrl);
      return {
        id: row.id,
        title: row.title,
        body,
        sort_order: row.sort_order,
      };
    });

    res.json({ templates, referral_url: shortUrl });
  } catch (err) {
    console.error('Partner post templates:', err);
    res.status(500).json({ error: 'Ошибка загрузки постов' });
  }
});

router.get('/assets/:id/download', partnerAuthMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM partner_assets WHERE id = $1 AND is_active = TRUE`,
      [req.params.id]
    );
    const asset = result.rows[0];
    if (!asset) return res.status(404).json({ error: 'Файл не найден' });
    res.download(asset.file_path, asset.file_name);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка скачивания' });
  }
});

router.get('/offer/public', (req, res) => {
  const html = buildPartnerOfferHtml({});
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

router.get('/offer', partnerAuthMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT full_name, email FROM partners WHERE id = $1', [req.partnerId]);
    const html = buildPartnerOfferHtml(result.rows[0] || {});
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="partner-offer-woner.html"');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка формирования договора' });
  }
});

router.get('/commissions/export', partnerAuthMiddleware, async (req, res) => {
  try {
    const bounds = parseExportBounds(req.query);
    if (!bounds) {
      return res.status(400).json({ error: 'Укажите период: month=YYYY-MM или from и to (YYYY-MM-DD)' });
    }

    const partnerRes = await db.query('SELECT * FROM partners WHERE id = $1', [req.partnerId]);
    const partner = partnerRes.rows[0];
    const withdrawalSummary = await getPartnerWithdrawalSummary(req.partnerId);

    const [rows, periodStats] = await Promise.all([
      db.query(
        `SELECT pc.created_at, pc.payment_type, pc.payment_amount, pc.commission_amount,
                pc.commission_percent, pc.description, m.name AS master_name, m.email AS master_email
         FROM partner_commissions pc
         JOIN masters m ON m.id = pc.master_id
         WHERE pc.partner_id = $1 AND pc.created_at >= $2 AND pc.created_at <= $3
         ORDER BY pc.created_at DESC`,
        [req.partnerId, bounds.from, bounds.to]
      ),
      getPartnerStats(req.partnerId, { from: bounds.from, to: bounds.to }),
    ]);

    const format = req.query.format || 'csv';
    const periodTotal = rows.rows.reduce((s, r) => s + Number(r.commission_amount), 0);
    const balance = Number(partner.balance);
    const frozen = withdrawalSummary.frozen;
    const totalEarned = Number(partner.total_earned);

    if (format === 'html') {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Отчёт Woner.ru</title>
        <style>
          body{font-family:system-ui,sans-serif;background:#f8fafc;padding:32px;color:#1e293b}
          .card{max-width:900px;margin:0 auto;background:#fff;border-radius:16px;box-shadow:0 4px 24px #7c3aed22;padding:32px}
          h1{color:#5b21b6;margin:0 0 8px} .sub{color:#64748b;margin:0 0 24px}
          .summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px}
          .summary div{background:#f5f3ff;border-radius:12px;padding:14px}
          .summary span{display:block;font-size:12px;color:#64748b} .summary strong{font-size:18px;color:#5b21b6}
          table{width:100%;border-collapse:collapse;font-size:14px}
          th{background:#7c3aed;color:#fff;text-align:left;padding:10px}
          td{border-bottom:1px solid #e2e8f0;padding:10px}
          .total{font-size:18px;font-weight:700;color:#6d28d9;margin-top:20px}
        </style></head><body><div class="card">
        <h1>Партнёрский отчёт Woner.ru</h1>
        <p class="sub">${partner.full_name} · ${partner.email} · ${bounds.label}</p>
        <div class="summary">
          <div><span>Заработано за период</span><strong>${periodTotal.toFixed(2)} ₽</strong></div>
          <div><span>Заработано всего с Woner</span><strong>${totalEarned.toFixed(2)} ₽</strong></div>
          <div><span>Баланс на Woner</span><strong>${balance.toFixed(2)} ₽</strong></div>
          <div><span>Заморожено (вывод)</span><strong>${frozen.toFixed(2)} ₽</strong></div>
          <div><span>Выведено всего</span><strong>${withdrawalSummary.withdrawn.toFixed(2)} ₽</strong></div>
        </div>
        <table><thead><tr><th>Дата</th><th>Мастер</th><th>Тип</th><th>Оплата</th><th>Комиссия</th></tr></thead><tbody>
        ${rows.rows.map((r) => `<tr><td>${new Date(r.created_at).toLocaleString('ru-RU')}</td><td>${r.master_name || r.master_email}</td><td>${r.payment_type}</td><td>${Number(r.payment_amount).toFixed(2)} ₽</td><td>${Number(r.commission_amount).toFixed(2)} ₽</td></tr>`).join('')}
        </tbody></table><p class="total">Итого за период: ${periodTotal.toFixed(2)} ₽</p></div></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="woner-partner-report-${bounds.key}.html"`);
      return res.send(html);
    }

    const lines = [
      '\uFEFFПартнёрский отчёт Woner.ru',
      `Партнёр;${csvEscape(partner.full_name)};${partner.email}`,
      `Период;${csvEscape(bounds.label)}`,
      `Заработано всего с Woner;${fmtMoneyCsv(totalEarned)}`,
      `Заработано за период;${fmtMoneyCsv(periodTotal)}`,
      `Баланс на Woner (доступно);${fmtMoneyCsv(balance)}`,
      `Заморожено на выводе;${fmtMoneyCsv(frozen)}`,
      `Выведено всего;${fmtMoneyCsv(withdrawalSummary.withdrawn)}`,
      `Комиссий за период;${periodStats.commissionsCount}`,
      '',
      'Дата;Мастер;Email;Тип оплаты;Сумма оплаты;Комиссия %;Комиссия ₽;Описание',
      ...rows.rows.map((r) => [
        new Date(r.created_at).toLocaleString('ru-RU'),
        csvEscape(r.master_name || ''),
        r.master_email,
        r.payment_type,
        fmtMoneyCsv(r.payment_amount),
        Number(r.commission_percent).toFixed(0),
        fmtMoneyCsv(r.commission_amount),
        csvEscape(r.description || ''),
      ].join(';')),
      '',
      `Итого за период;;;${fmtMoneyCsv(periodTotal)}`,
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="woner-partner-${bounds.key}.csv"`);
    res.send(lines.join('\n'));
  } catch (err) {
    console.error('Partner export:', err);
    res.status(500).json({ error: 'Ошибка экспорта' });
  }
});

router.post('/withdrawals', partnerAuthMiddleware, [
  body('amount').isFloat({ min: PARTNER_MIN_WITHDRAWAL }),
  body('bank_name').trim().notEmpty(),
  body('card_number').trim().notEmpty(),
  body('full_name').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { amount, bank_name, card_number, full_name } = req.body;
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const locked = await client.query(
        `SELECT balance FROM partners WHERE id = $1 FOR UPDATE`,
        [req.partnerId]
      );
      const balance = Number(locked.rows[0]?.balance || 0);
      const amt = Math.round(Number(amount) * 100) / 100;
      if (amt < PARTNER_MIN_WITHDRAWAL) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Минимальная сумма вывода: ${PARTNER_MIN_WITHDRAWAL} ₽` });
      }
      if (amt > balance) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Недостаточно средств. Доступно: ${balance.toFixed(2)} ₽` });
      }

      const pending = await client.query(
        `SELECT id FROM partner_withdrawals WHERE partner_id = $1 AND status = 'pending' LIMIT 1`,
        [req.partnerId]
      );
      if (pending.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'У вас уже есть заявка на вывод в обработке' });
      }

      const id = uuidv4();
      await client.query(
        `INSERT INTO partner_withdrawals (id, partner_id, amount, bank_name, card_number, full_name)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, req.partnerId, amt, bank_name.trim(), card_number.replace(/\s/g, ''), full_name.trim()]
      );
      await client.query(
        `UPDATE partners SET balance = balance - $1, updated_at = NOW() WHERE id = $2`,
        [amt, req.partnerId]
      );
      await client.query('COMMIT');
      res.status(201).json({
        id,
        amount: amt,
        status: 'pending',
        message: 'Сумма заморожена на балансе до обработки заявки',
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Partner withdrawal:', err);
    res.status(500).json({ error: 'Ошибка создания заявки' });
  }
});

router.get('/withdrawals', partnerAuthMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, amount, bank_name, full_name, status, created_at, processed_at
       FROM partner_withdrawals WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [req.partnerId]
    );
    res.json({
      withdrawals: result.rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
        card_number: '****',
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заявок' });
  }
});

module.exports = router;

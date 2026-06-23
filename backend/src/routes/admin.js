const express = require('express');
const db = require('../config/database');
const {
  isAdminConfigured,
  verifyAdminCredentials,
  signAdminToken,
  verifyAdminToken,
  adminAuthMiddleware,
} = require('../utils/adminAuth');
const { listAdminAccounts } = require('../utils/adminWorkspace');
const adminWorkspaceRoutes = require('./adminWorkspace');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    if (!isAdminConfigured()) {
      return res.status(503).json({ error: 'Админка не настроена (SITE_OWNER_EMAIL / SITE_OWNER_PASSWORD)' });
    }

    const { email, password } = req.body || {};
    if (!verifyAdminCredentials(email, password)) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const token = signAdminToken(normalizedEmail);
    res.json({ token, email: normalizedEmail });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

router.get('/verify', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ valid: false });
    }
    const decoded = verifyAdminToken(authHeader.split(' ')[1]);
    res.json({ valid: true, email: decoded.email });
  } catch {
    res.json({ valid: false });
  }
});

router.get('/overview', adminAuthMiddleware, async (_req, res) => {
  try {
    const [
      mastersTotal,
      mastersMonth,
      paymentsSucceeded,
      paymentsMonth,
      paymentsPending,
      unlimitedActive,
      bookingFeesMonth,
    ] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS c FROM masters'),
      db.query(
        `SELECT COUNT(*)::int AS c FROM masters
         WHERE created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')`
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM billing_payments WHERE status = 'succeeded'`
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM billing_payments
         WHERE status = 'succeeded'
           AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')`
      ),
      db.query(
        `SELECT COUNT(*)::int AS c FROM billing_payments WHERE status = 'pending'`
      ),
      db.query(
        `SELECT COUNT(*)::int AS c FROM masters
         WHERE tariff_type = 'unlimited'
           AND tariff_expires_at IS NOT NULL
           AND tariff_expires_at > NOW()`
      ),
      db.query(
        `SELECT COALESCE(SUM(ABS(amount)), 0)::numeric AS s FROM billing_transactions
         WHERE type = 'booking_fee'
           AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC')`
      ),
    ]);

    res.json({
      mastersTotal: mastersTotal.rows[0].c,
      mastersThisMonth: mastersMonth.rows[0].c,
      paymentsTotalRub: Number(paymentsSucceeded.rows[0].s),
      paymentsThisMonthRub: Number(paymentsMonth.rows[0].s),
      paymentsPending: paymentsPending.rows[0].c,
      unlimitedActive: unlimitedActive.rows[0].c,
      bookingFeesThisMonthRub: Number(bookingFeesMonth.rows[0].s),
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ error: 'Не удалось загрузить сводку' });
  }
});

router.get('/masters', adminAuthMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const result = await db.query(
      `SELECT id, email, name, last_name, salon_name, phone,
              balance, tariff_type, tariff_expires_at, created_at
       FROM masters
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      masters: result.rows.map((row) => ({
        ...row,
        balance: Number(row.balance ?? 0),
        display_name: [row.name, row.last_name].filter(Boolean).join(' ').trim() || row.salon_name || row.email,
      })),
    });
  } catch (err) {
    console.error('Admin masters error:', err);
    res.status(500).json({ error: 'Не удалось загрузить список мастеров' });
  }
});

router.get('/payments', adminAuthMiddleware, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const result = await db.query(
      `SELECT bp.id, bp.amount, bp.purpose, bp.status, bp.created_at, bp.yookassa_payment_id,
              m.id AS master_id, m.email, m.salon_name, m.name, m.last_name
       FROM billing_payments bp
       JOIN masters m ON m.id = bp.master_id
       ORDER BY bp.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      payments: result.rows.map((row) => ({
        ...row,
        amount: Number(row.amount ?? 0),
        master_name: [row.name, row.last_name].filter(Boolean).join(' ').trim() || row.salon_name || row.email,
      })),
    });
  } catch (err) {
    console.error('Admin payments error:', err);
    res.status(500).json({ error: 'Не удалось загрузить платежи' });
  }
});

router.get('/team', adminAuthMiddleware, (_req, res) => {
  res.json({ members: listAdminAccounts() });
});

router.use('/', adminWorkspaceRoutes);

module.exports = router;

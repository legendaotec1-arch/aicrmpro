const db = require('../config/database');
const { sendBalanceAlertEmail } = require('./email');

const REGISTRATION_BONUS = Number(process.env.BILLING_REGISTRATION_BONUS) || 60;
const PER_BOOKING_FEE = Number(process.env.BILLING_PER_BOOKING_FEE) || 30;
const UNLIMITED_PRICE = Number(process.env.BILLING_UNLIMITED_PRICE) || 1500;
const UNLIMITED_DAYS = Number(process.env.BILLING_UNLIMITED_DAYS) || 30;
const MIN_TOPUP = Number(process.env.BILLING_MIN_TOPUP) || 100;
const WARN_BALANCE = Number(process.env.BILLING_WARN_BALANCE) || 100;
const CRITICAL_BALANCE = Number(process.env.BILLING_CRITICAL_BALANCE) || 30;

function isBillingEnabled() {
  const v = (process.env.BILLING_ENABLED || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isUnlimitedActive(row) {
  return (
    row?.tariff_type === 'unlimited'
    && row?.tariff_expires_at
    && new Date(row.tariff_expires_at).getTime() > Date.now()
  );
}

function getBillingConfig() {
  return {
    enabled: isBillingEnabled(),
    perBookingFee: PER_BOOKING_FEE,
    unlimitedPrice: UNLIMITED_PRICE,
    unlimitedDays: UNLIMITED_DAYS,
    minTopup: MIN_TOPUP,
    warnBalance: WARN_BALANCE,
    criticalBalance: CRITICAL_BALANCE
  };
}

function formatBillingState(row) {
  const balance = Number(row?.balance ?? 0);
  const unlimitedActive = isUnlimitedActive(row);
  const booking = evaluateOnlineBooking(row);

  return {
    balance,
    tariff_type: row?.tariff_type || 'per_booking',
    tariff_expires_at: row?.tariff_expires_at || null,
    tariff_auto_renew: row?.tariff_auto_renew !== false,
    unlimited_active: unlimitedActive,
    online_booking_allowed: booking.allowed,
    online_booking_block_reason: booking.reason || null,
    per_booking_fee: PER_BOOKING_FEE,
    unlimited_price: UNLIMITED_PRICE,
    unlimited_days: UNLIMITED_DAYS,
    min_topup: MIN_TOPUP
  };
}

function evaluateOnlineBooking(row) {
  if (!isBillingEnabled()) {
    return { allowed: true, reason: null };
  }

  if (isUnlimitedActive(row)) {
    return { allowed: true, reason: null };
  }

  const balance = Number(row?.balance ?? 0);
  if (balance >= PER_BOOKING_FEE) {
    return { allowed: true, reason: null };
  }

  if (balance < CRITICAL_BALANCE) {
    return {
      allowed: false,
      reason: 'Онлайн-запись временно недоступна. Пополните баланс в личном кабинете мастера.'
    };
  }

  return {
    allowed: false,
    reason: 'Недостаточно средств для онлайн-записи. Пополните баланс в личном кабинете мастера.'
  };
}

async function getMasterBillingRow(masterId, client = db) {
  const result = await client.query(
    `SELECT id, email, balance, tariff_type, tariff_expires_at, tariff_auto_renew,
            billing_warn_sent, billing_critical_sent
     FROM masters WHERE id = $1`,
    [masterId]
  );
  return result.rows[0] || null;
}

async function listBillingTransactions(masterId, limit = 30) {
  const result = await db.query(
    `SELECT id, type, amount, balance_after, description, created_at
     FROM billing_transactions
     WHERE master_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [masterId, limit]
  );
  return result.rows;
}

async function checkAndSendBalanceAlerts(masterRow, client = db) {
  if (!masterRow?.email) return;

  const balance = Number(masterRow.balance ?? 0);
  const updates = [];
  const params = [];
  let idx = 1;

  if (balance < CRITICAL_BALANCE && !masterRow.billing_critical_sent) {
    try {
      await sendBalanceAlertEmail({
        to: masterRow.email,
        balance,
        level: 'critical',
        criticalThreshold: CRITICAL_BALANCE,
        warnThreshold: WARN_BALANCE,
        perBookingFee: PER_BOOKING_FEE
      });
    } catch (mailErr) {
      console.error('Balance alert email (critical):', mailErr.message);
    }
    updates.push(`billing_critical_sent = TRUE`);
  } else if (balance >= CRITICAL_BALANCE && masterRow.billing_critical_sent) {
    updates.push(`billing_critical_sent = FALSE`);
  }

  if (balance < WARN_BALANCE && !masterRow.billing_warn_sent) {
    try {
      await sendBalanceAlertEmail({
        to: masterRow.email,
        balance,
        level: 'warn',
        criticalThreshold: CRITICAL_BALANCE,
        warnThreshold: WARN_BALANCE,
        perBookingFee: PER_BOOKING_FEE
      });
    } catch (mailErr) {
      console.error('Balance alert email (warn):', mailErr.message);
    }
    updates.push(`billing_warn_sent = TRUE`);
  } else if (balance >= WARN_BALANCE && masterRow.billing_warn_sent) {
    updates.push(`billing_warn_sent = FALSE`);
  }

  if (updates.length) {
    await client.query(
      `UPDATE masters SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
      [masterRow.id]
    );
  }
}

async function chargeOnlineBookingFee(masterId, appointmentId) {
  if (!isBillingEnabled()) return { charged: false };

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const locked = await client.query(
      `SELECT id, email, balance, tariff_type, tariff_expires_at, tariff_auto_renew,
              billing_warn_sent, billing_critical_sent
       FROM masters WHERE id = $1 FOR UPDATE`,
      [masterId]
    );
    const row = locked.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return { error: 'Мастер не найден' };
    }

    const booking = evaluateOnlineBooking(row);
    if (!booking.allowed) {
      await client.query('ROLLBACK');
      const err = new Error(booking.reason || 'Онлайн-запись недоступна');
      err.code = 'BOOKING_BLOCKED';
      err.status = 403;
      throw err;
    }

    if (isUnlimitedActive(row)) {
      await client.query('COMMIT');
      return { charged: false, unlimited: true };
    }

    const balanceBefore = Number(row.balance);
    const balanceAfter = balanceBefore - PER_BOOKING_FEE;

    await client.query(
      `UPDATE masters SET balance = $1, updated_at = NOW() WHERE id = $2`,
      [balanceAfter, masterId]
    );

    await client.query(
      `INSERT INTO billing_transactions (master_id, type, amount, balance_after, appointment_id, description)
       VALUES ($1, 'booking_fee', $2, $3, $4, $5)`,
      [
        masterId,
        -PER_BOOKING_FEE,
        balanceAfter,
        appointmentId,
        `Списание за онлайн-запись (${PER_BOOKING_FEE} ₽)`
      ]
    );

    const updatedRow = { ...row, balance: balanceAfter };
    await checkAndSendBalanceAlerts(updatedRow, client);

    await client.query('COMMIT');
    return { charged: true, balanceAfter };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function applyTopup(masterId, amount, yookassaPaymentId) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id FROM billing_transactions WHERE yookassa_payment_id = $1`,
      [yookassaPaymentId]
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return { duplicate: true };
    }

    const locked = await client.query(
      `SELECT id, email, balance, tariff_type, tariff_expires_at, tariff_auto_renew,
              billing_warn_sent, billing_critical_sent
       FROM masters WHERE id = $1 FOR UPDATE`,
      [masterId]
    );
    const row = locked.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      throw new Error('Master not found');
    }

    const balanceAfter = Number(row.balance) + Number(amount);

    await client.query(
      `UPDATE masters SET balance = $1, updated_at = NOW() WHERE id = $2`,
      [balanceAfter, masterId]
    );

    await client.query(
      `INSERT INTO billing_transactions (master_id, type, amount, balance_after, yookassa_payment_id, description)
       VALUES ($1, 'topup', $2, $3, $4, $5)`,
      [masterId, amount, balanceAfter, yookassaPaymentId, `Пополнение баланса (${amount} ₽)`]
    );

    await client.query(
      `UPDATE billing_payments SET status = 'succeeded' WHERE yookassa_payment_id = $1`,
      [yookassaPaymentId]
    );

    const updatedRow = { ...row, balance: balanceAfter };
    await checkAndSendBalanceAlerts(updatedRow, client);

    await client.query('COMMIT');
    return { balanceAfter };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function applyUnlimitedPurchase(masterId, yookassaPaymentId) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id FROM billing_transactions WHERE yookassa_payment_id = $1`,
      [yookassaPaymentId]
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return { duplicate: true };
    }

    const locked = await client.query(
      `SELECT id, email, balance FROM masters WHERE id = $1 FOR UPDATE`,
      [masterId]
    );
    const row = locked.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      throw new Error('Master not found');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + UNLIMITED_DAYS);

    await client.query(
      `UPDATE masters
       SET tariff_type = 'unlimited',
           tariff_expires_at = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [expiresAt.toISOString(), masterId]
    );

    await client.query(
      `INSERT INTO billing_transactions (master_id, type, amount, balance_after, yookassa_payment_id, description)
       VALUES ($1, 'unlimited_purchase', $2, $3, $4, $5)`,
      [
        masterId,
        -UNLIMITED_PRICE,
        Number(row.balance),
        yookassaPaymentId,
        `Тариф «Безлимит» на ${UNLIMITED_DAYS} дней (${UNLIMITED_PRICE} ₽)`
      ]
    );

    await client.query(
      `UPDATE billing_payments SET status = 'succeeded' WHERE yookassa_payment_id = $1`,
      [yookassaPaymentId]
    );

    await client.query('COMMIT');
    return { tariff_expires_at: expiresAt.toISOString() };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function setAutoRenew(masterId, enabled) {
  await db.query(
    `UPDATE masters SET tariff_auto_renew = $1, updated_at = NOW() WHERE id = $2`,
    [Boolean(enabled), masterId]
  );
}

/** Приветственный бонус при регистрации (по умолчанию 60 ₽), один раз на мастера */
async function grantRegistrationBonus(masterId) {
  if (!masterId || REGISTRATION_BONUS <= 0) return { granted: false };

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const dup = await client.query(
      `SELECT id FROM billing_transactions WHERE master_id = $1 AND type = 'registration_bonus' LIMIT 1`,
      [masterId]
    );
    if (dup.rows.length > 0) {
      await client.query('ROLLBACK');
      return { granted: false, reason: 'already_granted' };
    }

    const row = await client.query(
      `SELECT balance FROM masters WHERE id = $1 FOR UPDATE`,
      [masterId]
    );
    if (!row.rows[0]) {
      await client.query('ROLLBACK');
      return { granted: false, reason: 'master_not_found' };
    }

    const balanceAfter = Number(row.rows[0].balance ?? 0) + REGISTRATION_BONUS;
    await client.query(
      `UPDATE masters SET balance = $1, updated_at = NOW() WHERE id = $2`,
      [balanceAfter, masterId]
    );
    await client.query(
      `INSERT INTO billing_transactions (master_id, type, amount, balance_after, description)
       VALUES ($1, 'registration_bonus', $2, $3, $4)`,
      [masterId, REGISTRATION_BONUS, balanceAfter, `Приветственный бонус ${REGISTRATION_BONUS} ₽`]
    );

    await client.query('COMMIT');
    return { granted: true, balanceAfter };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '42703' || err.code === '42P01') {
      console.warn('Registration bonus skipped (billing schema):', err.message);
      return { granted: false, reason: 'schema' };
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  REGISTRATION_BONUS,
  PER_BOOKING_FEE,
  UNLIMITED_PRICE,
  UNLIMITED_DAYS,
  MIN_TOPUP,
  WARN_BALANCE,
  CRITICAL_BALANCE,
  isBillingEnabled,
  isUnlimitedActive,
  getBillingConfig,
  formatBillingState,
  evaluateOnlineBooking,
  getMasterBillingRow,
  listBillingTransactions,
  chargeOnlineBookingFee,
  applyTopup,
  applyUnlimitedPurchase,
  setAutoRenew,
  grantRegistrationBonus,
  checkAndSendBalanceAlerts
};

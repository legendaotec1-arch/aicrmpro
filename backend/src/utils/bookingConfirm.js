const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { sendMail, isEmailConfigured } = require('./email');
const { internalAuthHeaders } = require('./internalAuth');
const { validateBookingContact } = require('./clientBookingValidation');
const { resolveSalonId } = require('./salonResolve');
const { getSalonMasterById } = require('./salonMasters');
const { getSalonTimezone } = require('./salonTimezone');
const { assertSlotAvailable, withBookingTransaction, hasOverlap } = require('./bookingLock');
const {
  findOrCreateClient,
  upsertSalonClientContact,
  normalizeChannel
} = require('./clients');
const {
  chargeOnlineBookingFee,
  getMasterBillingRow,
  evaluateOnlineBooking,
  isBillingEnabled
} = require('./billing');
const { scheduleClientPhotoSync } = require('./clientPhoto');
const { formatPersonName } = require('./masterDisplay');

function formatSalonMasterName(master) {
  return formatPersonName(master?.name, master?.last_name) || master?.specialty || 'Мастер';
}

const PENDING_TTL_MINUTES = 30;
const CODE_TTL_MINUTES = 15;

async function ensureBookingConfirmSchema() {
  try {
    await db.query('SELECT 1 FROM booking_confirm_pending LIMIT 1');
  } catch {
    const sqlPath = path.join(__dirname, '../db/migrations/043_booking_confirm_pending.sql');
    await db.query(fs.readFileSync(sqlPath, 'utf8'));
  }
  await db.query('ALTER TABLE booking_confirm_pending ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(255)');
}

async function assertSlotFreeForPending(salonMasterId, appointmentTime, durationMinutes, salonTimezone, excludeToken = null) {
  await withBookingTransaction(db, async (client) => {
    await assertSlotAvailable(client, salonMasterId, appointmentTime, durationMinutes, null, salonTimezone);
    const startMs = new Date(appointmentTime).getTime();
    const endMs = startMs + (durationMinutes || 60) * 60000;
    const pendingRes = await client.query(
      `SELECT appointment_time, duration_minutes FROM booking_confirm_pending
       WHERE salon_master_id = $1 AND status = 'pending' AND expires_at > NOW()
         AND ($2::text IS NULL OR token != $2)`,
      [salonMasterId, excludeToken]
    );
    if (hasOverlap(pendingRes.rows, startMs, endMs)) {
      const err = new Error('Это время только что заняли. Выберите другой слот.');
      err.status = 409;
      throw err;
    }
  });
}

async function failPending(token, reason) {
  await db.query(
    `UPDATE booking_confirm_pending
     SET status = 'expired', cancel_reason = $2
     WHERE token = $1 AND status = 'pending'`,
    [token, reason || null]
  );
}

async function findActivePending({ salonMasterId, appointmentTime, phone, channel }) {
  const res = await db.query(
    `SELECT * FROM booking_confirm_pending
     WHERE salon_master_id = $1 AND appointment_time = $2 AND phone = $3 AND channel = $4
       AND status = 'pending' AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [salonMasterId, appointmentTime, phone, channel]
  );
  return res.rows[0] || null;
}

async function findSiblingConfirmed(row) {
  const res = await db.query(
    `SELECT appointment_id, channel, confirmed_at FROM booking_confirm_pending
     WHERE salon_master_id = $1 AND appointment_time = $2 AND phone = $3 AND channel = $4
       AND status = 'confirmed' AND appointment_id IS NOT NULL
       AND confirmed_at > NOW() - INTERVAL '40 minutes'
     ORDER BY confirmed_at DESC LIMIT 1`,
    [row.salon_master_id, row.appointment_time, row.phone, row.channel]
  );
  return res.rows[0] || null;
}

function buildBotDeepLink(channel, token) {
  const telegramUsername = process.env.TELEGRAM_BOT_USERNAME;
  const maxBotUsername = (process.env.MAX_BOT_USERNAME || '').replace(/^@/, '').replace(/.*max\.ru\//i, '');
  if (channel === 'telegram' && telegramUsername) {
    return `https://t.me/${telegramUsername}?start=confirm_${token}`;
  }
  if (channel === 'max' && maxBotUsername) {
    return `https://max.ru/${maxBotUsername}?start=confirm_${token}`;
  }
  return null;
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function generateEmailCode() {
  return String(crypto.randomInt(100000, 999999));
}

function formatPriceRub(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n).toLocaleString('ru-RU')} ₽`;
}

function formatAppointmentLabel(appointmentTime, timeZone) {
  try {
    return new Date(appointmentTime).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timeZone || 'Europe/Moscow'
    });
  } catch {
    return String(appointmentTime);
  }
}

function buildConfirmMessage(row, timeZone) {
  const when = formatAppointmentLabel(row.appointment_time, timeZone);
  const masterLine = row.master_name ? `👤 ${row.master_name}\n` : '';
  return [
    '📋 <b>Подтвердите запись</b>',
    '',
    `💅 ${row.service_name}`,
    masterLine.trimEnd(),
    `🕒 ${when}`,
    `💰 ${formatPriceRub(row.service_price)}`,
    '',
    '🔔 Напоминания о визите придут сюда за <b>24 часа</b> и за <b>3 часа</b> до записи.',
    '',
    'Нажмите кнопку ниже, чтобы подтвердить.'
  ].filter(Boolean).join('\n');
}

function buildMaxConfirmMessage(row, timeZone) {
  const when = formatAppointmentLabel(row.appointment_time, timeZone);
  const masterLine = row.master_name ? `👤 ${row.master_name}\n` : '';
  return [
    '📋 *Подтвердите запись*',
    '',
    `💅 ${row.service_name}`,
    masterLine.trimEnd(),
    `🕒 ${when}`,
    `💰 ${formatPriceRub(row.service_price)}`,
    '',
    '🔔 Напоминания о визите придут сюда за *24 часа* и за *3 часа* до записи.',
    '',
    'Нажмите кнопку ниже, чтобы подтвердить.'
  ].filter(Boolean).join('\n');
}

async function assertBookingAllowed(salonId) {
  if (!isBillingEnabled()) return;
  const billingRow = await getMasterBillingRow(salonId);
  const bookingCheck = evaluateOnlineBooking(billingRow);
  if (!bookingCheck.allowed) {
    const err = new Error(bookingCheck.reason || 'Онлайн-запись временно недоступна');
    err.status = 403;
    err.code = 'BOOKING_BLOCKED';
    throw err;
  }
}

async function assertNotBlocked(salonId, phone, salonMasterId) {
  const blockedByPhone = await db.query(
    `SELECT 1 FROM blacklist
     WHERE master_id = $1 AND phone = $2
       AND (salon_master_id IS NULL OR salon_master_id = $3)
     LIMIT 1`,
    [salonId, phone, salonMasterId]
  );
  if (blockedByPhone.rows.length > 0) {
    const err = new Error('Запись недоступна');
    err.status = 403;
    err.code = 'BLOCKED';
    throw err;
  }
}

async function loadPendingByToken(token, { forUpdate = false } = {}) {
  const lock = forUpdate ? ' FOR UPDATE' : '';
  const res = await db.query(
    `SELECT * FROM booking_confirm_pending WHERE token = $1${lock}`,
    [token]
  );
  return res.rows[0] || null;
}

function pendingIsExpired(row) {
  return !row || row.status !== 'pending' || new Date(row.expires_at) < new Date();
}

async function expirePending(token) {
  await db.query(
    `UPDATE booking_confirm_pending SET status = 'expired' WHERE token = $1 AND status = 'pending'`,
    [token]
  );
}

async function sendMessengerConfirmMessage(channel, userId, token, row, timeZone) {
  const telegramBotUrl = (process.env.TELEGRAM_BOT_URL || 'http://localhost:3002').replace(/\/$/, '');
  const maxBotUrl = (process.env.MAX_BOT_URL || 'http://localhost:3001').replace(/\/$/, '');
  const headers = internalAuthHeaders();

  if (channel === 'telegram') {
    await axios.post(
      `${telegramBotUrl}/send-booking-confirm`,
      {
        telegramUserId: userId,
        message: buildConfirmMessage(row, timeZone),
        confirmToken: token
      },
      { headers, timeout: 20000 }
    );
    return;
  }

  await axios.post(
    `${maxBotUrl}/send-booking-confirm`,
    {
      maxUserId: userId,
      message: buildMaxConfirmMessage(row, timeZone),
      confirmToken: token
    },
    { headers, timeout: 20000 }
  );
}

async function finalizePendingBooking(row, { messengerUserId, photoUrl }) {
  const salonId = row.salon_id;
  const channel = row.channel === 'email' ? 'max' : row.channel;
  const messenger = normalizeChannel(channel);

  let clientId = await findOrCreateClient({
    channel: messenger,
    maxUserId: messenger === 'max' ? messengerUserId || null : null,
    telegramUserId: messenger === 'telegram' ? messengerUserId || null : null,
    name: row.name,
    phone: row.phone,
    salonId
  });

  clientId = await upsertSalonClientContact(salonId, clientId, {
    phone: row.phone,
    name: row.name
  });

  if (messenger === 'max' && messengerUserId) {
    await db.query(
      `UPDATE clients SET max_user_id = $1, messenger = 'max' WHERE id = $2`,
      [String(messengerUserId), clientId]
    );
  } else if (messenger === 'telegram' && messengerUserId) {
    await db.query(
      `UPDATE clients SET telegram_user_id = $1, messenger = 'telegram' WHERE id = $2`,
      [String(messengerUserId), clientId]
    );
  }

  if (row.email) {
    await db.query(
      `UPDATE clients SET email = COALESCE(NULLIF(email, ''), $1) WHERE id = $2`,
      [row.email.toLowerCase(), clientId]
    );
  }

  const blockedByClient = await db.query(
    `SELECT 1 FROM blacklist
     WHERE master_id = $1 AND client_id = $2
       AND (salon_master_id IS NULL OR salon_master_id = $3)
     LIMIT 1`,
    [salonId, clientId, row.salon_master_id]
  );
  if (blockedByClient.rows.length > 0) {
    const err = new Error('Запись недоступна');
    err.status = 403;
    err.code = 'BLOCKED';
    throw err;
  }

  if (messengerUserId && messenger !== 'email') {
    scheduleClientPhotoSync(clientId, {
      channel: messenger,
      messengerUserId,
      photoUrl
    });
  }

  const appointmentId = uuidv4();
  const salonTimezone = await getSalonTimezone(db, salonId);

  await withBookingTransaction(db, async (client) => {
    await assertSlotAvailable(
      client,
      row.salon_master_id,
      row.appointment_time,
      row.duration_minutes,
      null,
      salonTimezone
    );
    await client.query(
      `INSERT INTO appointments (id, master_id, salon_master_id, client_id, service_name, service_price, appointment_time, duration_minutes, client_notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed')`,
      [
        appointmentId,
        salonId,
        row.salon_master_id,
        clientId,
        row.service_name,
        row.service_price,
        row.appointment_time,
        row.duration_minutes,
        row.client_notes
      ]
    );
  });

  try {
    await chargeOnlineBookingFee(salonId, appointmentId);
  } catch (billingErr) {
    await db.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
    throw billingErr;
  }

  await db.query(
    `UPDATE booking_confirm_pending
     SET status = 'confirmed', appointment_id = $2, confirmed_at = NOW(), messenger_user_id = COALESCE($3, messenger_user_id)
     WHERE id = $1 AND status = 'pending'`,
    [row.id, appointmentId, messengerUserId || null]
  );

  await db.query(
    `UPDATE booking_confirm_pending
     SET status = 'expired', cancel_reason = 'Запись подтверждена'
     WHERE salon_master_id = $1 AND appointment_time = $2 AND phone = $3
       AND status = 'pending' AND token != $4`,
    [row.salon_master_id, row.appointment_time, row.phone, row.token]
  );

  return { appointmentId, clientId, channel: row.channel };
}

async function createPendingBooking({
  masterId,
  salonMasterId,
  channel,
  name,
  phone,
  email,
  appointmentTime,
  serviceName,
  servicePrice,
  duration,
  clientNotes,
  messengerUserId
}) {
  await ensureBookingConfirmSchema();

  const ch = String(channel || '').toLowerCase();
  if (!['telegram', 'max', 'email'].includes(ch)) {
    const err = new Error('Выберите способ подтверждения: Telegram, MAX или Email');
    err.status = 400;
    throw err;
  }

  const resolvedSalonId = await resolveSalonId(masterId);
  if (!resolvedSalonId) {
    const err = new Error('Мастер не найден');
    err.status = 404;
    throw err;
  }

  if (!salonMasterId) {
    const err = new Error('Укажите мастера');
    err.status = 400;
    throw err;
  }

  const contact = validateBookingContact({ name, phone });
  if (!contact.ok) {
    const err = new Error(contact.error);
    err.status = 400;
    throw err;
  }

  if (ch === 'email') {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      const err = new Error('Укажите корректный email');
      err.status = 400;
      throw err;
    }
    if (!isEmailConfigured()) {
      const err = new Error('Подтверждение по email временно недоступно');
      err.status = 503;
      throw err;
    }
    email = normalizedEmail;
  }

  const teamMaster = await getSalonMasterById(salonMasterId, resolvedSalonId);
  if (!teamMaster || !teamMaster.is_active) {
    const err = new Error('Мастер не найден');
    err.status = 404;
    throw err;
  }

  await assertBookingAllowed(resolvedSalonId);
  await assertNotBlocked(resolvedSalonId, contact.phone, salonMasterId);

  const durationMinutes = duration || 60;
  const masterName = formatSalonMasterName(teamMaster);
  const salonTimezone = await getSalonTimezone(db, resolvedSalonId);

  await assertSlotFreeForPending(salonMasterId, appointmentTime, durationMinutes, salonTimezone);

  const existing = await findActivePending({
    salonMasterId,
    appointmentTime,
    phone: contact.phone,
    channel: ch
  });
  if (existing) {
    return {
      token: existing.token,
      channel: ch,
      expiresAt: existing.expires_at,
      botDeepLink: buildBotDeepLink(ch, existing.token),
      messageSent: false,
      reused: true
    };
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + PENDING_TTL_MINUTES * 60 * 1000);

  let codeHash = null;
  if (ch === 'email') {
    const code = generateEmailCode();
    codeHash = await bcrypt.hash(code, 10);
    const when = formatAppointmentLabel(appointmentTime, salonTimezone);
    const sent = await sendMail({
      to: email,
      subject: 'Woner.ru — код подтверждения записи',
      text: [
        `Здравствуйте, ${contact.name}!`,
        '',
        'Вы записываетесь:',
        `${serviceName} — ${formatPriceRub(servicePrice)}`,
        `${masterName}, ${when}`,
        '',
        `Ваш код: ${code}`,
        `Код действует ${CODE_TTL_MINUTES} минут.`,
        '',
        'Если вы не оформляли запись — проигнорируйте это письмо.',
        '',
        'С уважением, команда Woner.ru'
      ].join('\n'),
      html: `
        <p>Здравствуйте, <b>${contact.name}</b>!</p>
        <p><b>${serviceName}</b> — ${formatPriceRub(servicePrice)}<br>
        ${masterName}, ${when}</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
        <p>Код действует ${CODE_TTL_MINUTES} минут.</p>
        <p style="color:#888">Если вы не оформляли запись — проигнорируйте это письмо.</p>
      `
    });
    if (!sent) {
      const err = new Error('Не удалось отправить код на email');
      err.status = 500;
      throw err;
    }
  }

  const insertRes = await db.query(
    `INSERT INTO booking_confirm_pending (
       token, channel, salon_id, salon_master_id, name, phone, email,
       appointment_time, service_name, service_price, duration_minutes,
       client_notes, master_name, code_hash, messenger_user_id, expires_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      token,
      ch,
      resolvedSalonId,
      salonMasterId,
      contact.name,
      contact.phone,
      ch === 'email' ? email : null,
      appointmentTime,
      serviceName,
      servicePrice,
      durationMinutes,
      clientNotes || null,
      masterName,
      codeHash,
      messengerUserId || null,
      expiresAt.toISOString()
    ]
  );

  const row = insertRes.rows[0];
  const botDeepLink = buildBotDeepLink(ch, token);

  if ((ch === 'telegram' || ch === 'max') && messengerUserId) {
    try {
      await sendMessengerConfirmMessage(ch, messengerUserId, token, row, salonTimezone);
    } catch (err) {
      console.error('[bookingConfirm] send messenger message:', err.response?.data || err.message);
    }
  }

  return {
    token,
    channel: ch,
    expiresAt: row.expires_at,
    botDeepLink,
    messageSent: Boolean(messengerUserId && (ch === 'telegram' || ch === 'max'))
  };
}

async function attachMessengerAndSendConfirm({ token, channel, userId, photoUrl, name }) {
  await ensureBookingConfirmSchema();
  const messenger = normalizeChannel(channel);
  if (!userId) {
    const err = new Error('Не указан пользователь мессенджера');
    err.status = 400;
    throw err;
  }

  await db.query('BEGIN');
  try {
    const row = await loadPendingByToken(token, { forUpdate: true });
    if (!row) {
      const err = new Error('Заявка не найдена');
      err.status = 404;
      throw err;
    }
    if (row.status === 'confirmed' && row.appointment_id) {
      await db.query('COMMIT');
      return { status: 'confirmed', appointmentId: row.appointment_id };
    }
    if (pendingIsExpired(row)) {
      await expirePending(token);
      await db.query('COMMIT');
      const err = new Error('Время подтверждения истекло. Запишитесь снова на сайте.');
      err.status = 410;
      throw err;
    }
    if (row.channel !== messenger) {
      const err = new Error('Способ подтверждения не совпадает');
      err.status = 400;
      throw err;
    }

    await db.query(
      `UPDATE booking_confirm_pending SET messenger_user_id = $2 WHERE id = $1`,
      [row.id, String(userId)]
    );

    const salonTimezone = await getSalonTimezone(db, row.salon_id);
    await sendMessengerConfirmMessage(messenger, String(userId), token, row, salonTimezone);
    await db.query('COMMIT');
    return { status: 'pending', token };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}

async function confirmByMessenger({ token, channel, userId, photoUrl }) {
  await ensureBookingConfirmSchema();
  const messenger = normalizeChannel(channel);

  const row = await loadPendingByToken(token);
  if (!row) {
    const err = new Error('Заявка не найдена');
    err.status = 404;
    throw err;
  }
  if (row.status === 'confirmed' && row.appointment_id) {
    return { status: 'confirmed', appointmentId: row.appointment_id, channel: row.channel };
  }
  if (pendingIsExpired(row)) {
    await expirePending(token);
    const err = new Error('Время подтверждения истекло');
    err.status = 410;
    throw err;
  }
  if (row.channel !== messenger) {
    const err = new Error('Неверный канал подтверждения');
    err.status = 400;
    throw err;
  }
  if (row.messenger_user_id && String(row.messenger_user_id) !== String(userId)) {
    console.warn('[bookingConfirm] messenger user mismatch', {
      token: token?.slice?.(0, 12),
      stored: row.messenger_user_id,
      received: userId
    });
    const err = new Error('Подтвердить может только тот, кто открыл бота');
    err.status = 403;
    throw err;
  }

  if (!row.messenger_user_id) {
    await db.query(
      `UPDATE booking_confirm_pending SET messenger_user_id = $2 WHERE id = $1 AND status = 'pending'`,
      [row.id, String(userId)]
    );
  }

  try {
    const result = await finalizePendingBooking(row, {
      messengerUserId: String(userId),
      photoUrl
    });
    return { status: 'confirmed', ...result };
  } catch (err) {
    if (err.status === 409) {
      await failPending(token, err.message || 'Время уже занято');
    }
    throw err;
  }
}

async function confirmByEmailCode({ token, code }) {
  await ensureBookingConfirmSchema();
  const normalizedCode = String(code || '').trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    const err = new Error('Введите 6-значный код из письма');
    err.status = 400;
    throw err;
  }

  const row = await loadPendingByToken(token);
  if (!row) {
    const err = new Error('Заявка не найдена');
    err.status = 404;
    throw err;
  }
  if (row.status === 'confirmed' && row.appointment_id) {
    return { status: 'confirmed', appointmentId: row.appointment_id, channel: 'email' };
  }
  if (pendingIsExpired(row)) {
    await expirePending(token);
    const err = new Error('Время подтверждения истекло');
    err.status = 410;
    throw err;
  }
  if (row.channel !== 'email') {
    const err = new Error('Для этой заявки нужно подтверждение в мессенджере');
    err.status = 400;
    throw err;
  }
  const ok = await bcrypt.compare(normalizedCode, row.code_hash || '');
  if (!ok) {
    const err = new Error('Неверный код');
    err.status = 401;
    throw err;
  }

  try {
    const result = await finalizePendingBooking(row, { messengerUserId: null, photoUrl: null });
    return { status: 'confirmed', ...result };
  } catch (err) {
    if (err.status === 409) {
      await failPending(token, err.message || 'Время уже занято');
    }
    throw err;
  }
}

async function getConfirmStatus(token) {
  await ensureBookingConfirmSchema();
  const row = await loadPendingByToken(token);
  if (!row) {
    const err = new Error('Заявка не найдена');
    err.status = 404;
    throw err;
  }
  if (row.status === 'pending' && new Date(row.expires_at) < new Date()) {
    await expirePending(token);
    const sibling = await findSiblingConfirmed(row);
    if (sibling) {
      return {
        status: 'confirmed',
        channel: sibling.channel || row.channel,
        appointmentId: sibling.appointment_id,
        expiresAt: row.expires_at,
        cancelReason: null
      };
    }
    return { status: 'expired', channel: row.channel, cancelReason: row.cancel_reason };
  }
  if (row.status !== 'confirmed') {
    const sibling = await findSiblingConfirmed(row);
    if (sibling) {
      return {
        status: 'confirmed',
        channel: sibling.channel || row.channel,
        appointmentId: sibling.appointment_id,
        expiresAt: row.expires_at,
        cancelReason: null
      };
    }
  }
  return {
    status: row.status,
    channel: row.channel,
    appointmentId: row.appointment_id || null,
    expiresAt: row.expires_at,
    cancelReason: row.cancel_reason || null
  };
}

module.exports = {
  ensureBookingConfirmSchema,
  createPendingBooking,
  attachMessengerAndSendConfirm,
  confirmByMessenger,
  confirmByEmailCode,
  getConfirmStatus,
  buildConfirmMessage,
  buildMaxConfirmMessage
};

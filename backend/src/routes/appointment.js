const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { resolveTeamMasterId } = require('../utils/teamContext');
const { masterAuthMiddleware: authMiddleware } = require('../utils/masterAuth');
const { findOrCreateClient, ensureSalonClientProfile, upsertSalonClientContact } = require('../utils/clients');
const { sendMessengerNotification } = require('../utils/notify');
const { displayPhone } = require('../utils/phoneRu');
const { resolveTelegramChatUrl } = require('../utils/messengerLinks');
const { validateBookingContact } = require('../utils/clientBookingValidation');
const { teamAppointmentFilter } = require('../utils/appointmentScope');
const { assertSlotAvailable, withBookingTransaction } = require('../utils/bookingLock');
const {
  chargeBookingFee,
  isBillingEnabled,
  getMasterBillingRow,
  evaluateOnlineBooking
} = require('../utils/billing');

const router = express.Router();

// Получить все записи мастера
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date, status } = req.query;

    let query = `
      SELECT a.*,
             c.name as client_name,
             c.photo_url as client_photo_url,
             COALESCE(NULLIF(scp.phone, ''), c.phone) as client_phone,
             c.telegram_user_id,
             c.telegram_username,
             c.max_user_id,
             c.messenger as client_messenger,
             sm.name as salon_master_name
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN salon_client_profiles scp
        ON scp.client_id = c.id
       AND scp.salon_id = a.master_id
       AND COALESCE(scp.deleted_at, 'epoch'::timestamp) = 'epoch'::timestamp
      LEFT JOIN salon_masters sm ON a.salon_master_id = sm.id
      WHERE a.master_id = $1
    `;
    const params = [req.masterId];

    if (req.isTeamMember && req.salonMasterId) {
      params.push(req.salonMasterId);
      query += ` AND a.salon_master_id = $${params.length}`;
    }

    if (date) {
      query += ` AND DATE(a.appointment_time) = $${params.length + 1}`;
      params.push(date);
    }

    if (status) {
      query += ` AND a.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY a.appointment_time';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении записей' });
  }
});

// Создать запись вручную
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      clientId: existingClientId,
      clientName,
      clientPhone,
      clientMaxUserId,
      clientTelegramUserId,
      clientChannel,
      serviceName,
      servicePrice,
      appointmentTime,
      duration,
      clientNotes,
      salonMasterId
    } = req.body;

    const salonMasterResolved = await resolveTeamMasterId(req.masterId, salonMasterId);
    const durationMinutes = duration || 60;

    let clientId;

    if (existingClientId) {
      const access = await db.query(
        `SELECT c.id
         FROM clients c
         WHERE c.id = $1
           AND (
             EXISTS (
               SELECT 1 FROM salon_client_profiles scp
               WHERE scp.client_id = c.id AND scp.salon_id = $2
                 AND COALESCE(scp.deleted_at, 'epoch'::timestamp) = 'epoch'::timestamp
             )
             OR EXISTS (
               SELECT 1 FROM appointments a
               WHERE a.client_id = c.id AND a.master_id = $2
             )
           )`,
        [existingClientId, req.masterId]
      );
      if (!access.rows.length) {
        return res.status(404).json({ error: 'Клиент не найден' });
      }
      clientId = existingClientId;
      await ensureSalonClientProfile(req.masterId, clientId);
    } else {
      const contact = validateBookingContact({
        name: clientName,
        phone: clientPhone,
        requirePhone: false
      });
      if (!contact.ok) {
        return res.status(400).json({ error: contact.error });
      }

      clientId = await findOrCreateClient({
        channel: clientChannel || (clientTelegramUserId ? 'telegram' : 'max'),
        maxUserId: clientMaxUserId,
        telegramUserId: clientTelegramUserId,
        name: contact.name,
        phone: contact.phone || undefined,
        salonId: req.masterId
      });
      clientId = await upsertSalonClientContact(req.masterId, clientId, {
        phone: contact.phone,
        name: contact.name
      });
    }

    if (!serviceName?.trim()) {
      return res.status(400).json({ error: 'Укажите услугу' });
    }

    if (isBillingEnabled()) {
      const billingRow = await getMasterBillingRow(req.masterId);
      const bookingCheck = evaluateOnlineBooking(billingRow);
      if (!bookingCheck.allowed) {
        return res.status(403).json({
          error: 'Недостаточно средств на балансе. Пополните баланс для создания записи.',
          code: 'BOOKING_BLOCKED'
        });
      }
    }

    const appointmentId = uuidv4();
    try {
      await withBookingTransaction(db, async (client) => {
        await assertSlotAvailable(client, salonMasterResolved, appointmentTime, durationMinutes);
        await client.query(
          `INSERT INTO appointments (id, master_id, salon_master_id, client_id, service_name, service_price, appointment_time, duration_minutes, client_notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [appointmentId, req.masterId, salonMasterResolved, clientId, serviceName, servicePrice, appointmentTime, durationMinutes, clientNotes]
        );
      });
    } catch (lockErr) {
      if (lockErr.status === 409) {
        return res.status(409).json({ error: lockErr.message });
      }
      throw lockErr;
    }

    try {
      await chargeBookingFee(req.masterId, appointmentId, { context: 'manual' });
    } catch (billingErr) {
      await db.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
      const status = billingErr.status || 403;
      return res.status(status).json({
        error: billingErr.message || 'Недостаточно средств на балансе',
        code: billingErr.code || 'BOOKING_BLOCKED'
      });
    }

    res.status(201).json({ success: true, appointmentId });
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Ошибка при создании записи' });
  }
});

// Контакты клиента для карточки записи (телефон + ссылка в мессенджер)
router.get('/:id/contact', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const scope = teamAppointmentFilter(req, 'a', 3);
    const result = await db.query(
      `SELECT COALESCE(NULLIF(scp.phone, ''), c.phone) AS client_phone,
              c.telegram_user_id,
              c.telegram_username,
              c.max_user_id,
              c.messenger AS client_messenger
       FROM appointments a
       JOIN clients c ON c.id = a.client_id
       LEFT JOIN salon_client_profiles scp
         ON scp.client_id = c.id
        AND scp.salon_id = a.master_id
        AND COALESCE(scp.deleted_at, 'epoch'::timestamp) = 'epoch'::timestamp
       WHERE a.id = $1 AND a.master_id = $2${scope.sql}`,
      [id, req.masterId, ...scope.params]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    const row = result.rows[0];
    const phone = displayPhone(row.client_phone);
    let telegramUrl = null;
    if (row.client_messenger === 'telegram' && row.telegram_user_id) {
      telegramUrl = await resolveTelegramChatUrl({
        telegramUserId: row.telegram_user_id,
        telegramUsername: row.telegram_username
      });
    }

    res.json({
      phone,
      messenger: row.client_messenger,
      telegramUrl,
      maxUserId: row.max_user_id || null,
      canMessage: !!(row.telegram_user_id || row.max_user_id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении контактов' });
  }
});

// Обновить запись
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceName, servicePrice, appointmentTime, duration, status, clientNotes, cancelReason } = req.body;

    const scope = teamAppointmentFilter(req, 'a', 3);
    const existing = await db.query(
      `SELECT a.* FROM appointments a WHERE a.id = $1 AND a.master_id = $2${scope.sql}`,
      [id, req.masterId, ...scope.params]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }
    const current = existing.rows[0];

    if (appointmentTime && appointmentTime !== current.appointment_time && current.status === 'confirmed') {
      try {
        await withBookingTransaction(db, async (client) => {
          await assertSlotAvailable(
            client,
            current.salon_master_id,
            appointmentTime,
            duration || current.duration_minutes || 60,
            id
          );
        });
      } catch (lockErr) {
        if (lockErr.status === 409) {
          return res.status(409).json({ error: lockErr.message });
        }
        throw lockErr;
      }
    }

    // Если меняем статус на отменён, получим данные для уведомления
    let clientData = null;
    let masterContacts = null;
    if (status === 'cancelled') {
      const appointmentData = await db.query(
        `SELECT c.max_user_id, c.telegram_user_id, c.messenger, a.service_name, a.appointment_time
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         WHERE a.id = $1 AND a.master_id = $2`,
        [id, req.masterId]
      );
      if (appointmentData.rows.length > 0) {
        clientData = appointmentData.rows[0];
      }
      // Получаем контакты мастера для сообщения
      const masterData = await db.query(
        `SELECT social_telegram, social_max, phone FROM masters WHERE id = $1`,
        [req.masterId]
      );
      if (masterData.rows.length > 0) {
        masterContacts = masterData.rows[0];
      }
    }

    const result = await db.query(
      `UPDATE appointments SET
        service_name = COALESCE($1, service_name),
        service_price = COALESCE($2, service_price),
        appointment_time = COALESCE($3, appointment_time),
        duration_minutes = COALESCE($4, duration_minutes),
        status = COALESCE($5, status),
        client_notes = COALESCE($6, client_notes)
       WHERE id = $7 AND master_id = $8`,
      [serviceName, servicePrice, appointmentTime, duration, status, clientNotes, id, req.masterId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    if (status === 'no_show') {
      const aptRow = await db.query(
        `SELECT a.client_id, a.master_id, a.service_name, a.appointment_time
         FROM appointments a
         WHERE a.id = $1 AND a.master_id = $2`,
        [id, req.masterId]
      );
      const row = aptRow.rows[0];
      if (row?.client_id) {
        await ensureSalonClientProfile(row.master_id, row.client_id);
        const dateStr = new Date(row.appointment_time).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });
        const noteLine = `Неявка: ${dateStr}, ${row.service_name || 'запись'}`;
        await db.query(
          `UPDATE salon_client_profiles
           SET notes = CASE
             WHEN notes IS NULL OR TRIM(notes) = '' THEN $1
             ELSE notes || E'\\n' || $1
           END,
           updated_at = NOW()
           WHERE salon_id = $2 AND client_id = $3`,
          [noteLine, row.master_id, row.client_id]
        );
      }
    }

    // Отправляем уведомление при отмене
    if (status === 'cancelled' && clientData) {
      try {
        const dateStr = new Date(clientData.appointment_time).toLocaleDateString('ru-RU', {
          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
        });

        // Формируем контакты для связи
        const contacts = [];
        if (masterContacts?.social_telegram) contacts.push(`Telegram: ${masterContacts.social_telegram}`);
        if (masterContacts?.social_max) contacts.push(`MAX: ${masterContacts.social_max}`);
        if (masterContacts?.phone) contacts.push(`тел: ${masterContacts.phone}`);

        const contactStr = contacts.length > 0
          ? `\n\nВаши контакты для связи: ${contacts.join(', ')}`
          : '';

        const reasonStr = cancelReason && String(cancelReason).trim()
          ? `\n\nПричина: ${String(cancelReason).trim()}`
          : '';

        const message = `❌ Ваша запись на ${clientData.service_name} (${dateStr}) отменена мастером.${reasonStr}${contactStr}`;
        await sendMessengerNotification(clientData, message);
      } catch (notifyErr) {
        console.error('[appointment] Failed to send cancel notification:', notifyErr.message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении записи' });
  }
});

// Удалить запись
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const scope = teamAppointmentFilter(req, 'a', 3);
    const result = await db.query(
      `DELETE FROM appointments a WHERE a.id = $1 AND a.master_id = $2${scope.sql} RETURNING id`,
      [id, req.masterId, ...scope.params]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении записи' });
  }
});

// Отправить сообщение клиенту
router.post('/:id/message', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const scope = teamAppointmentFilter(req, 'a', 3);
    const appointment = await db.query(
      `SELECT c.max_user_id, c.telegram_user_id, c.messenger, a.service_name, a.appointment_time
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       WHERE a.id = $1 AND a.master_id = $2${scope.sql}`,
      [id, req.masterId, ...scope.params]
    );

    if (appointment.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    const client = appointment.rows[0];
    await sendMessengerNotification(client, message);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при отправке сообщения' });
  }
});

module.exports = router;
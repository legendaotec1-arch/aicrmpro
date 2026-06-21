const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { resolveTeamMasterId } = require('../utils/teamContext');
const { findOrCreateClient } = require('../utils/clients');
const { sendMessengerNotification } = require('../utils/notify');

const router = express.Router();

// Middleware для проверки авторизации мастера
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.masterId = decoded.masterId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Неверный токен' });
  }
};

// Получить все записи мастера
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date, status } = req.query;

    let query = `
      SELECT a.*,
             c.name as client_name,
             c.phone as client_phone,
             c.telegram_user_id,
             c.max_user_id,
             c.messenger as client_messenger,
             sm.name as salon_master_name
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN salon_masters sm ON a.salon_master_id = sm.id
      WHERE a.master_id = $1
    `;
    const params = [req.masterId];

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
    const startMs = new Date(appointmentTime).getTime();
    const endMs = startMs + durationMinutes * 60000;

    const clientId = await findOrCreateClient({
      channel: clientChannel || (clientTelegramUserId ? 'telegram' : 'max'),
      maxUserId: clientMaxUserId,
      telegramUserId: clientTelegramUserId,
      name: clientName,
      phone: clientPhone
    });

    const booked = await db.query(
      `SELECT appointment_time, duration_minutes FROM appointments
       WHERE salon_master_id = $1 AND status = 'confirmed'
         AND DATE(appointment_time) = DATE($2::timestamptz)`,
      [salonMasterResolved, appointmentTime]
    );

    const hasOverlap = booked.rows.some((b) => {
      const bookedStart = new Date(b.appointment_time).getTime();
      const bookedEnd = bookedStart + (b.duration_minutes || 60) * 60000;
      return startMs < bookedEnd && endMs > bookedStart;
    });

    if (hasOverlap) {
      return res.status(409).json({ error: 'Время уже занято' });
    }

    const appointmentId = uuidv4();
    await db.query(
      `INSERT INTO appointments (id, master_id, salon_master_id, client_id, service_name, service_price, appointment_time, duration_minutes, client_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [appointmentId, req.masterId, salonMasterResolved, clientId, serviceName, servicePrice, appointmentTime, durationMinutes, clientNotes]
    );

    res.status(201).json({ success: true, appointmentId });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Ошибка при создании записи' });
  }
});

// Обновить запись
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceName, servicePrice, appointmentTime, duration, status, clientNotes } = req.body;

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

        const message = `❌ Ваша запись на ${clientData.service_name} (${dateStr}) отменена мастером.${contactStr}`;
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
    await db.query('DELETE FROM appointments WHERE id = $1 AND master_id = $2', [id, req.masterId]);
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

    const appointment = await db.query(
      `SELECT c.max_user_id, c.telegram_user_id, c.messenger, a.service_name, a.appointment_time
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       WHERE a.id = $1 AND a.master_id = $2`,
      [id, req.masterId]
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
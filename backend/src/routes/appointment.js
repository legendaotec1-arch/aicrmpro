const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

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
      SELECT a.*, c.name as client_name, c.phone as client_phone, c.max_user_id
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
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
    const { clientName, clientPhone, clientMaxUserId, serviceName, servicePrice, appointmentTime, duration, clientNotes } = req.body;

    // Находим или создаем клиента
    let client;
    if (clientMaxUserId) {
      client = await db.query('SELECT id FROM clients WHERE max_user_id = $1', [clientMaxUserId]);
    }

    if (!client?.rows.length && clientPhone) {
      client = await db.query('SELECT id FROM clients WHERE phone = $1', [clientPhone]);
    }

    if (!client?.rows.length) {
      const clientId = uuidv4();
      await db.query(
        'INSERT INTO clients (id, name, phone, max_user_id) VALUES ($1, $2, $3, $4)',
        [clientId, clientName || 'Клиент', clientPhone || null, clientMaxUserId || null]
      );
      client = { rows: [{ id: clientId }] };
    }

    const clientId = client.rows[0].id;

    // Проверяем занятость времени
    const existing = await db.query(
      `SELECT id FROM appointments
       WHERE master_id = $1 AND appointment_time = $2 AND status = 'confirmed'`,
      [req.masterId, appointmentTime]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Время уже занято' });
    }

    // Создаем запись
    const appointmentId = uuidv4();
    await db.query(
      `INSERT INTO appointments (id, master_id, client_id, service_name, service_price, appointment_time, duration_minutes, client_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [appointmentId, req.masterId, clientId, serviceName, servicePrice, appointmentTime, duration || 60, clientNotes]
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
      `SELECT c.max_user_id, a.service_name, a.appointment_time
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       WHERE a.id = $1 AND a.master_id = $2`,
      [id, req.masterId]
    );

    if (appointment.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    const { max_user_id } = appointment.rows[0];

    // Здесь будет интеграция с MAX API для отправки сообщения
    console.log(`Отправка сообщения клиенту ${max_user_id}: ${message}`);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при отправке сообщения' });
  }
});

module.exports = router;
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const router = express.Router();

// Получить свободные слоты на дату
router.get('/:masterId/slots', async (req, res) => {
  try {
    const { masterId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Укажите дату' });
    }

    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();

    const schedule = await db.query(
      `SELECT * FROM work_schedule
       WHERE master_id = $1 AND day_of_week = $2 AND is_day_off = false`,
      [masterId, dayOfWeek]
    );

    if (schedule.rows.length === 0) {
      return res.json([]);
    }

    const { start_time, end_time } = schedule.rows[0];

    // Проверяем исключения
    const dateStr = date.split('T')[0];
    const exception = await db.query(
      `SELECT * FROM schedule_exceptions
       WHERE master_id = $1 AND exception_date = $2`,
      [masterId, dateStr]
    );

    if (exception.rows.length > 0 && !exception.rows[0].is_working) {
      return res.json([]);
    }

    const exceptionStartTime = exception.rows[0]?.start_time;
    const exceptionEndTime = exception.rows[0]?.end_time;

    // Генерируем слоты по 30 минут
    const slots = generateTimeSlots(
      exceptionStartTime || start_time,
      exceptionEndTime || end_time
    );

    // Получаем занятые слоты
    const booked = await db.query(
      `SELECT appointment_time, duration_minutes FROM appointments
       WHERE master_id = $1 AND DATE(appointment_time) = $2 AND status = 'confirmed'`,
      [masterId, dateStr]
    );

    // Фильтруем занятые
    const freeSlots = slots.filter(slot => {
      return !booked.rows.some(b => {
        const bookedStart = new Date(b.appointment_time).getTime();
        const bookedEnd = bookedStart + (b.duration_minutes || 60) * 60000;
        const slotTime = slot.getTime();
        return slotTime >= bookedStart && slotTime < bookedEnd;
      });
    });

    res.json(freeSlots.map(s => s.toISOString()));
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Ошибка при получении слотов' });
  }
});

// Создать запись
router.post('/book', async (req, res) => {
  try {
    const { masterId, maxUserId, name, phone, appointmentTime, serviceName, servicePrice, duration, clientNotes } = req.body;

    // Проверяем, не занято ли время
    const existing = await db.query(
      `SELECT id FROM appointments
       WHERE master_id = $1 AND appointment_time = $2 AND status = 'confirmed'`,
      [masterId, appointmentTime]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Время уже занято' });
    }

    // Находим или создаем клиента
    let clientResult = await db.query('SELECT id FROM clients WHERE max_user_id = $1', [maxUserId]);

    if (clientResult.rows.length === 0) {
      const clientId = uuidv4();
      await db.query(
        'INSERT INTO clients (id, max_user_id, name, phone) VALUES ($1, $2, $3, $4)',
        [clientId, maxUserId, name || 'Клиент', phone]
      );
      clientResult = { rows: [{ id: clientId }] };
    }

    const clientId = clientResult.rows[0].id;

    // Создаем запись
    const appointmentId = uuidv4();
    await db.query(
      `INSERT INTO appointments (id, master_id, client_id, service_name, service_price, appointment_time, duration_minutes, client_notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')`,
      [appointmentId, masterId, clientId, serviceName, servicePrice, appointmentTime, duration || 60, clientNotes]
    );

    res.status(201).json({ success: true, appointmentId });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Ошибка при создании записи' });
  }
});

// Получить свои записи (для клиента)
router.get('/my/:maxUserId', async (req, res) => {
  try {
    const { maxUserId } = req.params;

    const appointments = await db.query(
      `SELECT a.*, m.name as master_name, m.address
       FROM appointments a
       JOIN masters m ON a.master_id = m.id
       JOIN clients c ON a.client_id = c.id
       WHERE c.max_user_id = $1 AND a.status = 'confirmed'
       ORDER BY a.appointment_time`,
      [maxUserId]
    );

    res.json(appointments.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении записей' });
  }
});

// Отменить запись
router.post('/cancel/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { maxUserId } = req.body;

    const result = await db.query(
      `UPDATE appointments SET status = 'cancelled'
       WHERE id = $1 AND client_id = (SELECT id FROM clients WHERE max_user_id = $2)
       RETURNING id`,
      [appointmentId, maxUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при отмене записи' });
  }
});

// Генерация слотов
function generateTimeSlots(startTime, endTime) {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let current = new Date();
  current.setHours(startHour, startMin, 0, 0);

  const end = new Date();
  end.setHours(endHour, endMin, 0, 0);

  while (current < end) {
    slots.push(new Date(current));
    current.setMinutes(current.getMinutes() + 30);
  }

  return slots;
}

module.exports = router;
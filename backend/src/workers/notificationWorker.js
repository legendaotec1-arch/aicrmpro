const cron = require('node-cron');
const db = require('../config/database');

// Функция отправки уведомлений через MAX
async function sendMaxNotification(maxUserId, message) {
  // Интеграция с MAX API
  console.log(`Отправка уведомления пользователю ${maxUserId}: ${message}`);
  // Здесь будет реальная интеграция с API MAX
  return true;
}

// Форматирование времени
function formatTime(date) {
  return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Форматирование даты
function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Отправка уведомлений за 24 часа
async function send24HourReminders() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const appointments = await db.query(`
      SELECT a.*, c.max_user_id, c.name as client_name, m.name as master_name, m.address
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN masters m ON a.master_id = m.id
      WHERE a.appointment_time BETWEEN $1 AND $2
      AND a.status = 'confirmed'
      AND c.max_user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.appointment_id = a.id 
        AND n.type = 'reminder_24h'
        AND n.status = 'sent'
      )
    `, [tomorrow.toISOString(), tomorrowEnd.toISOString()]);

    for (const apt of appointments) {
      const message = `⏰ Напоминаем: завтра у вас запись к мастеру ${apt.master_name}!\n\n` +
        `📍 Адрес: ${apt.address || 'не указан'}\n` +
        `⏰ Время: ${formatTime(apt.appointment_time)}\n` +
        `💅 Услуга: ${apt.service_name}\n\n` +
        `❌ Отменить запись: /cancel_${apt.id}`;

      await sendMaxNotification(apt.max_user_id, message);

      await db.query(`
        INSERT INTO notifications (client_id, appointment_id, type, sent_at, status)
        VALUES ($1, $2, 'reminder_24h', NOW(), 'sent')
      `, [apt.client_id, apt.id]);
    }

    console.log(`Отправлено ${appointments.rows.length} уведомлений за 24 часа`);
  } catch (error) {
    console.error('Error sending 24h reminders:', error);
  }
}

// Отправка уведомлений за 3 часа
async function send3HourReminders() {
  try {
    const now = new Date();
    const in3Hours = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const in3HoursEnd = new Date(in3Hours.getTime() + 60 * 60 * 1000); // +1 час для точности

    const appointments = await db.query(`
      SELECT a.*, c.max_user_id, c.name as client_name, m.name as master_name, m.address
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN masters m ON a.master_id = m.id
      WHERE a.appointment_time BETWEEN $1 AND $2
      AND a.status = 'confirmed'
      AND c.max_user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.appointment_id = a.id 
        AND n.type = 'reminder_3h'
        AND n.status = 'sent'
      )
    `, [in3Hours.toISOString(), in3HoursEnd.toISOString()]);

    for (const apt of appointments) {
      const message = `⏰ Уже через 3 часа ваша запись к мастеру ${apt.master_name}!\n\n` +
        `📍 Адрес: ${apt.address || 'не указан'}\n` +
        `⏰ Время: ${formatTime(apt.appointment_time)}\n` +
        `💅 Услуга: ${apt.service_name}\n\n` +
        `Если вам нужно отменить запись, напишите нам.`;

      await sendMaxNotification(apt.max_user_id, message);

      await db.query(`
        INSERT INTO notifications (client_id, appointment_id, type, sent_at, status)
        VALUES ($1, $2, 'reminder_3h', NOW(), 'sent')
      `, [apt.client_id, apt.id]);
    }

    console.log(`Отправлено ${appointments.rows.length} уведомлений за 3 часа`);
  } catch (error) {
    console.error('Error sending 3h reminders:', error);
  }
}

// Планировщик задач
// Каждые 10 минут проверяем записи
cron.schedule('*/10 * * * *', () => {
  console.log('Проверка уведомлений...');
  send24HourReminders();
  send3HourReminders();
});

console.log('Worker уведомлений запущен');

// Запуск вручную для тестирования
if (require.main === module) {
  send24HourReminders().catch(console.error);
  send3HourReminders().catch(console.error);
}
const cron = require('node-cron');
const db = require('../config/database');
const { sendMessengerNotification } = require('../utils/notify');
const { renderInviteMessage, buildBookingLink } = require('../utils/repeatInvite');

function formatTime(date) {
  return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

async function send24HourReminders() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const appointments = await db.query(`
      SELECT a.*, c.id as client_id, c.messenger, c.max_user_id, c.telegram_user_id,
             c.name as client_name, m.name as master_name, m.address
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN masters m ON a.master_id = m.id
      WHERE a.appointment_time BETWEEN $1 AND $2
      AND a.status = 'confirmed'
      AND (c.max_user_id IS NOT NULL OR c.telegram_user_id IS NOT NULL)
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.appointment_id = a.id
        AND n.type = 'reminder_24h'
        AND n.status = 'sent'
      )
    `, [tomorrow.toISOString(), tomorrowEnd.toISOString()]);

    for (const apt of appointments.rows) {
      const message = `⏰ Напоминаем: завтра у вас запись к мастеру ${apt.master_name}!\n\n` +
        `📍 Адрес: ${apt.address || 'не указан'}\n` +
        `⏰ Время: ${formatTime(apt.appointment_time)}\n` +
        `💅 Услуга: ${apt.service_name}\n\n` +
        `❌ Отменить запись: /cancel_${apt.id}`;

      await sendMessengerNotification(apt, message);

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

async function send3HourReminders() {
  try {
    const now = new Date();
    const in3Hours = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const in3HoursEnd = new Date(in3Hours.getTime() + 60 * 60 * 1000);

    const appointments = await db.query(`
      SELECT a.*, c.id as client_id, c.messenger, c.max_user_id, c.telegram_user_id,
             c.name as client_name, m.name as master_name, m.address
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN masters m ON a.master_id = m.id
      WHERE a.appointment_time BETWEEN $1 AND $2
      AND a.status = 'confirmed'
      AND (c.max_user_id IS NOT NULL OR c.telegram_user_id IS NOT NULL)
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.appointment_id = a.id
        AND n.type = 'reminder_3h'
        AND n.status = 'sent'
      )
    `, [in3Hours.toISOString(), in3HoursEnd.toISOString()]);

    for (const apt of appointments.rows) {
      const message = `⏰ Уже через 3 часа ваша запись к мастеру ${apt.master_name}!\n\n` +
        `📍 Адрес: ${apt.address || 'не указан'}\n` +
        `⏰ Время: ${formatTime(apt.appointment_time)}\n` +
        `💅 Услуга: ${apt.service_name}\n\n` +
        `❌ Отменить: /cancel_${apt.id}`;

      await sendMessengerNotification(apt, message);

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

async function sendRepeatInvites() {
  try {
    const salons = await db.query(`
      SELECT id, name, salon_name, repeat_invite_days, repeat_invite_message
      FROM masters
      WHERE repeat_invite_enabled = TRUE
    `);

    for (const salon of salons.rows) {
      const days = salon.repeat_invite_days || 30;
      const appointments = await db.query(
        `SELECT a.id, a.client_id, c.messenger, c.max_user_id, c.telegram_user_id, c.name AS client_name
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         WHERE a.master_id = $1
           AND a.status IN ('completed', 'confirmed')
           AND a.appointment_time < NOW()
           AND DATE(a.appointment_time) = CURRENT_DATE - $2::int
           AND (c.max_user_id IS NOT NULL OR c.telegram_user_id IS NOT NULL)
           AND NOT EXISTS (
             SELECT 1 FROM notifications n
             WHERE n.appointment_id = a.id AND n.type = 'repeat_invite' AND n.status = 'sent'
           )`,
        [salon.id, days]
      );

      const bookingLink = buildBookingLink(salon.id);
      const salonName = salon.salon_name || salon.name;

      for (const apt of appointments.rows) {
        const message = renderInviteMessage(salon.repeat_invite_message, {
          clientName: apt.client_name,
          salonName,
          bookingLink
        });

        const sent = await sendMessengerNotification(apt, message);
        if (sent) {
          await db.query(
            `INSERT INTO notifications (client_id, appointment_id, type, sent_at, status)
             VALUES ($1, $2, 'repeat_invite', NOW(), 'sent')`,
            [apt.client_id, apt.id]
          );
        }
      }

      if (appointments.rows.length > 0) {
        console.log(`Повторные приглашения (${salonName}): ${appointments.rows.length}`);
      }
    }
  } catch (error) {
    console.error('Error sending repeat invites:', error);
  }
}

cron.schedule('*/10 * * * *', () => {
  console.log('Проверка уведомлений...');
  send24HourReminders();
  send3HourReminders();
  sendRepeatInvites();
});

console.log('Worker уведомлений запущен (MAX + Telegram)');

if (require.main === module) {
  send24HourReminders().catch(console.error);
  send3HourReminders().catch(console.error);
}

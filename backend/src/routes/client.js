const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { uploadsDir } = require('../config/paths');
const {
  findOrCreateClient,
  getClientByMessengerUserId,
  normalizeChannel,
  ensureSalonClientProfile,
  upsertSalonClientContact,
  mergeClientTelegramUsername
} = require('../utils/clients');
const { isRuPhoneComplete, normalizeRuPhoneForStorage } = require('../utils/phoneRu');
const { validateBookingContact } = require('../utils/clientBookingValidation');
const { resolveMasterId, isResolvedMasterId } = require('../utils/links');
const { getSalonMasterById } = require('../utils/salonMasters');
const { getAvailableSlots } = require('../utils/bookingSlots');
const { verifyTelegramLoginWidget } = require('../utils/telegramAuth');
const { getOrCreateConversation, listMessages, addMessage } = require('../utils/chat');
const { notifyOwnerNewChatMessage, notifyOwnerNewReview } = require('../utils/salonNotify');
const { scheduleClientPhotoSync, applyClientPhoto } = require('../utils/clientPhoto');
const {
  chargeOnlineBookingFee,
  getMasterBillingRow,
  evaluateOnlineBooking,
  isBillingEnabled
} = require('../utils/billing');

const router = express.Router();

const reviewPhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const reviewPhotoUpload = multer({
  storage: reviewPhotoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) cb(null, true);
    else cb(new Error('Только изображения'));
  }
});

// Синхронизация аватара из MAX/Telegram (вызывают боты при /start)
router.post('/sync-avatar', async (req, res) => {
  try {
    const { channel, userId, maxUserId, telegramUserId, photoUrl, name, username } = req.body;
    const messenger = normalizeChannel(channel);
    const messengerUserId = userId || (messenger === 'telegram' ? telegramUserId : maxUserId);
    if (!messengerUserId) {
      return res.status(400).json({ error: 'Не указан userId' });
    }

    let clientId = await getClientByMessengerUserId(messenger, messengerUserId);
    if (!clientId) {
      clientId = await findOrCreateClient({
        channel: messenger,
        maxUserId: messenger === 'max' ? messengerUserId : null,
        telegramUserId: messenger === 'telegram' ? messengerUserId : null,
        name: name || 'Клиент'
      });
    }

    if (name) {
      await db.query('UPDATE clients SET name = COALESCE(NULLIF(name, \'\'), $1) WHERE id = $2', [name, clientId]);
    }
    if (username) {
      await mergeClientTelegramUsername(clientId, username);
    }

    const saved = await applyClientPhoto(clientId, {
      channel: messenger,
      messengerUserId,
      photoUrl
    });

    res.json({ ok: true, clientId, photo_url: saved });
  } catch (error) {
    console.error('sync-avatar:', error);
    res.status(500).json({ error: 'Не удалось обновить фото' });
  }
});

// Клиент авторизовался у конкретного мастера/салона
router.post('/identify', async (req, res) => {
  try {
    const { masterId, channel, userId, maxUserId, telegramUserId, name, phone, photoUrl } = req.body;
    if (!masterId) return res.status(400).json({ error: 'Не указан мастер' });

    const salonId = resolveMasterId(masterId);
    if (!isResolvedMasterId(salonId)) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const messenger = normalizeChannel(channel);
    const messengerUserId = userId || (messenger === 'telegram' ? telegramUserId : maxUserId);
    if (!messengerUserId) return res.status(400).json({ error: 'Не авторизован' });

    const master = await db.query('SELECT id FROM masters WHERE id = $1', [salonId]);
    if (master.rows.length === 0) return res.status(404).json({ error: 'Мастер не найден' });

    let clientId = await findOrCreateClient({
      channel: messenger,
      maxUserId: messenger === 'max' ? messengerUserId : null,
      telegramUserId: messenger === 'telegram' ? messengerUserId : null,
      name,
      phone: isRuPhoneComplete(phone) ? normalizeRuPhoneForStorage(phone) : undefined,
      salonId
    });

    clientId = await upsertSalonClientContact(salonId, clientId, {
      phone: isRuPhoneComplete(phone) ? phone : undefined,
      name
    });
    scheduleClientPhotoSync(clientId, {
      channel: messenger,
      messengerUserId,
      photoUrl
    });
    res.json({ success: true, clientId });
  } catch (error) {
    console.error('Client identify error:', error);
    res.status(500).json({ error: 'Ошибка авторизации клиента' });
  }
});

// Вход клиента через Telegram Login Widget (без бота)
router.post('/auth/telegram', async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(503).json({ error: 'Telegram-бот не настроен на сервере' });
    }

    const {
      id,
      first_name,
      last_name,
      username,
      photo_url,
      auth_date,
      hash,
      masterId
    } = req.body;

    if (!masterId) {
      return res.status(400).json({ error: 'Не указан мастер' });
    }

    const resolvedMasterId = resolveMasterId(masterId);
    const master = await db.query('SELECT id FROM masters WHERE id = $1', [resolvedMasterId]);
    if (master.rows.length === 0) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const widgetData = { id, first_name, last_name, username, photo_url, auth_date, hash };

    if (!verifyTelegramLoginWidget(widgetData, botToken)) {
      return res.status(401).json({ error: 'Не удалось подтвердить вход через Telegram' });
    }

    const telegramUserId = String(id);
    const displayName = [first_name, last_name].filter(Boolean).join(' ').trim() || null;

    let clientId = await findOrCreateClient({
      channel: 'telegram',
      telegramUserId,
      name: displayName || username || 'Клиент',
      telegramUsername: username,
      salonId: resolvedMasterId
    });
    await ensureSalonClientProfile(resolvedMasterId, clientId);

    if (photo_url) {
      await applyClientPhoto(clientId, {
        channel: 'telegram',
        messengerUserId: telegramUserId,
        photoUrl: photo_url
      });
    } else {
      scheduleClientPhotoSync(clientId, {
        channel: 'telegram',
        messengerUserId: telegramUserId
      });
    }

    res.json({
      ok: true,
      channel: 'telegram',
      telegramUserId,
      firstName: first_name || null,
      lastName: last_name || null,
      username: username || null,
      photoUrl: photo_url || null
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

// Оставить отзыв (после визита), до 3 фото
router.post('/reviews', reviewPhotoUpload.array('photos', 3), async (req, res) => {
  try {
    const {
      masterId,
      channel,
      userId,
      maxUserId,
      telegramUserId,
      rating,
      body,
      appointmentId,
      clientName
    } = req.body;

    const photo_urls = (req.files || []).slice(0, 3).map((f) => `/uploads/${f.filename}`);

    const salonId = resolveMasterId(masterId);
    const messenger = normalizeChannel(channel);
    const messengerUserId = userId || (messenger === 'telegram' ? telegramUserId : maxUserId);

    const r = parseInt(rating, 10);
    if (!r || r < 1 || r > 5) {
      return res.status(400).json({ error: 'Укажите оценку от 1 до 5' });
    }

    let clientId = await findOrCreateClient({
      channel: messenger,
      maxUserId: messenger === 'max' ? messengerUserId : null,
      telegramUserId: messenger === 'telegram' ? messengerUserId : null,
      name: clientName,
      salonId
    });

    const hasVisit = await db.query(
      `SELECT 1 FROM appointments
       WHERE master_id = $1 AND client_id = $2 AND status != 'cancelled' LIMIT 1`,
      [salonId, clientId]
    );
    if (hasVisit.rows.length === 0) {
      return res.status(403).json({ error: 'Отзыв доступен после записи' });
    }

    let salonMasterId = null;
    if (appointmentId) {
      const apt = await db.query(
        `SELECT salon_master_id FROM appointments
         WHERE id = $1 AND master_id = $2 AND client_id = $3`,
        [appointmentId, salonId, clientId]
      );
      if (apt.rows.length === 0) {
        return res.status(404).json({ error: 'Запись не найдена' });
      }
      salonMasterId = apt.rows[0].salon_master_id;

      const dup = await db.query('SELECT id FROM reviews WHERE appointment_id = $1', [appointmentId]);
      if (dup.rows.length > 0) {
        return res.status(409).json({ error: 'Отзыв по этой записи уже оставлен' });
      }
    }

    const id = uuidv4();
    await db.query(
      `INSERT INTO reviews (id, salon_id, client_id, appointment_id, salon_master_id, rating, body, client_name, photo_urls, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)`,
      [id, salonId, clientId, appointmentId || null, salonMasterId, r, body?.trim() || null, clientName || null, photo_urls]
    );

    notifyOwnerNewReview(salonId, {
      clientName: clientName || null,
      rating: r,
      body: body?.trim() || ''
    }).catch((err) => console.error('Review notify error:', err.message));

    res.status(201).json({ success: true, id, moderation: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при сохранении отзыва' });
  }
});

// Чат с салоном (клиент)
router.get('/:masterId/chat', async (req, res) => {
  try {
    const salonId = resolveMasterId(req.params.masterId);
    const channel = normalizeChannel(req.query.channel);
    const messengerUserId = req.query.userId;
    if (!messengerUserId) return res.status(400).json({ error: 'Не авторизован' });

    const clientId = await getClientByMessengerUserId(channel, messengerUserId);
    if (!clientId) return res.json({ messages: [] });

    const conversationId = await getOrCreateConversation(salonId, clientId);
    const messages = await listMessages(conversationId);
    res.json({ conversationId, messages });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка чата' });
  }
});

router.post('/:masterId/chat', async (req, res) => {
  try {
    const salonId = resolveMasterId(req.params.masterId);
    const { channel, userId, maxUserId, telegramUserId, body, name } = req.body;
    const messenger = normalizeChannel(channel);
    const messengerUserId = userId || (messenger === 'telegram' ? telegramUserId : maxUserId);
    if (!messengerUserId || !body?.trim()) {
      return res.status(400).json({ error: 'Некорректное сообщение' });
    }

    let clientId = await findOrCreateClient({
      channel: messenger,
      maxUserId: messenger === 'max' ? messengerUserId : null,
      telegramUserId: messenger === 'telegram' ? messengerUserId : null,
      name,
      salonId
    });

    const conversationId = await getOrCreateConversation(salonId, clientId);
    const text = body.trim();
    await addMessage(conversationId, 'client', text);

    const clientRow = await db.query('SELECT name FROM clients WHERE id = $1', [clientId]);
    notifyOwnerNewChatMessage(salonId, {
      clientName: clientRow.rows[0]?.name || name,
      body: text
    }).catch((err) => console.error('Chat notify error:', err.message));

    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка отправки' });
  }
});

// Получить свободные слоты на дату
router.get('/:masterId/slots', async (req, res) => {
  try {
    const salonId = resolveMasterId(req.params.masterId);
    const { date, salonMasterId, durationMinutes, excludeAppointmentId } = req.query;

    const slots = await getAvailableSlots(db, {
      salonId,
      salonMasterId,
      date,
      durationMinutes,
      excludeAppointmentId: excludeAppointmentId || null
    });

    res.json(slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при получении слотов' });
  }
});

// Создать запись (channel: max | telegram)
router.post('/book', async (req, res) => {
  try {
    const {
      masterId,
      salonMasterId,
      channel,
      maxUserId,
      telegramUserId,
      name,
      phone,
      appointmentTime,
      serviceName,
      servicePrice,
      duration,
      clientNotes,
      photoUrl
    } = req.body;

    console.log('[book] Received appointmentTime:', appointmentTime, 'typeof:', typeof appointmentTime);

    const messenger = normalizeChannel(channel);
    const resolvedSalonId = resolveMasterId(masterId);

    if (!salonMasterId) {
      return res.status(400).json({ error: 'Укажите мастера' });
    }

    const contact = validateBookingContact({ name, phone });
    if (!contact.ok) {
      return res.status(400).json({ error: contact.error });
    }

    const teamMaster = await getSalonMasterById(salonMasterId, resolvedSalonId);
    if (!teamMaster || !teamMaster.is_active) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const durationMinutes = duration || 60;
    const startMs = new Date(appointmentTime).getTime();
    const endMs = startMs + durationMinutes * 60000;

    const booked = await db.query(
      `SELECT appointment_time, duration_minutes FROM appointments
       WHERE salon_master_id = $1 AND status = 'confirmed'
         AND DATE(appointment_time) = DATE($2::timestamptz)`,
      [salonMasterId, appointmentTime]
    );

    const hasOverlap = booked.rows.some((b) => {
      const bookedStart = new Date(b.appointment_time).getTime();
      const bookedEnd = bookedStart + (b.duration_minutes || 60) * 60000;
      return startMs < bookedEnd && endMs > bookedStart;
    });

    if (hasOverlap) {
      return res.status(409).json({ error: 'Время уже занято' });
    }

    if (isBillingEnabled()) {
      const billingRow = await getMasterBillingRow(resolvedSalonId);
      const bookingCheck = evaluateOnlineBooking(billingRow);
      if (!bookingCheck.allowed) {
        return res.status(403).json({
          error: bookingCheck.reason || 'Онлайн-запись временно недоступна',
          code: 'BOOKING_BLOCKED'
        });
      }
    }

    let clientId = await findOrCreateClient({
      channel: messenger,
      maxUserId: messenger === 'max' ? maxUserId : null,
      telegramUserId: messenger === 'telegram' ? telegramUserId : null,
      name: contact.name,
      phone: contact.phone,
      salonId: resolvedSalonId
    });

    clientId = await upsertSalonClientContact(resolvedSalonId, clientId, {
      phone: contact.phone,
      name: contact.name
    });

    // Check blacklist (salon-wide or for selected master)
    const blockedByClient = await db.query(
      `SELECT 1 FROM blacklist
       WHERE master_id = $1 AND client_id = $2
         AND (salon_master_id IS NULL OR salon_master_id = $3)
       LIMIT 1`,
      [resolvedSalonId, clientId, salonMasterId]
    );
    const blockedByPhone = await db.query(
      `SELECT 1 FROM blacklist
       WHERE master_id = $1 AND phone = $2
         AND (salon_master_id IS NULL OR salon_master_id = $3)
       LIMIT 1`,
      [resolvedSalonId, contact.phone, salonMasterId]
    );
    if (blockedByClient.rows.length > 0 || blockedByPhone.rows.length > 0) {
      return res.status(403).json({ error: 'Запись недоступна', code: 'BLOCKED' });
    }

    scheduleClientPhotoSync(clientId, {
      channel: messenger,
      messengerUserId: messenger === 'telegram' ? telegramUserId : maxUserId,
      photoUrl
    });

    const appointmentId = uuidv4();
    await db.query(
      `INSERT INTO appointments (id, master_id, salon_master_id, client_id, service_name, service_price, appointment_time, duration_minutes, client_notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed')`,
      [appointmentId, resolvedSalonId, salonMasterId, clientId, serviceName, servicePrice, appointmentTime, durationMinutes, clientNotes]
    );

    try {
      await chargeOnlineBookingFee(resolvedSalonId, appointmentId);
    } catch (billingErr) {
      await db.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
      const status = billingErr.status || 403;
      return res.status(status).json({
        error: billingErr.message || 'Онлайн-запись недоступна',
        code: billingErr.code || 'BOOKING_BLOCKED'
      });
    }

    res.status(201).json({ success: true, appointmentId, channel: messenger });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Ошибка при создании записи' });
  }
});

// Данные записи клиента для переноса
router.get('/appointment/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const channel = normalizeChannel(req.query.channel);
    const userId = req.query.userId || req.query.telegramUserId || req.query.maxUserId;

    const clientId = await getClientByMessengerUserId(channel, userId);
    if (!clientId) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    const result = await db.query(
      `SELECT a.*, m.name AS master_name, m.address
       FROM appointments a
       JOIN masters m ON a.master_id = m.id
       WHERE a.id = $1 AND a.client_id = $2 AND a.status = 'confirmed'`,
      [appointmentId, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Ошибка при получении записи' });
  }
});

// Перенести запись клиента
router.put('/appointment/:appointmentId/reschedule', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const {
      channel,
      maxUserId,
      telegramUserId,
      userId,
      salonMasterId,
      appointmentTime,
      serviceName,
      servicePrice,
      duration,
      clientNotes,
      name,
      phone
    } = req.body;

    const messenger = normalizeChannel(channel);
    const messengerUserId = userId || (messenger === 'telegram' ? telegramUserId : maxUserId);
    const clientId = await getClientByMessengerUserId(messenger, messengerUserId);
    if (!clientId) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    if (name != null || phone != null) {
      const contact = validateBookingContact({
        name: name || ' ',
        phone: phone || '',
        requirePhone: true
      });
      if (!contact.ok) {
        return res.status(400).json({ error: contact.error });
      }
      const salonId = (await db.query(
        `SELECT master_id FROM appointments WHERE id = $1 AND client_id = $2`,
        [appointmentId, clientId]
      )).rows[0]?.master_id;
      if (salonId) {
        await upsertSalonClientContact(salonId, clientId, {
          phone: contact.phone,
          name: contact.name
        });
      }
    }

    const current = await db.query(
      `SELECT master_id FROM appointments WHERE id = $1 AND client_id = $2 AND status = 'confirmed'`,
      [appointmentId, clientId]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    await ensureSalonClientProfile(current.rows[0].master_id, clientId);

    const resolvedSalonMasterId = salonMasterId;
    const teamMaster = await getSalonMasterById(resolvedSalonMasterId, current.rows[0].master_id);
    if (!teamMaster || !teamMaster.is_active) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const durationMinutes = duration || 60;
    const startMs = new Date(appointmentTime).getTime();
    const endMs = startMs + durationMinutes * 60000;

    const booked = await db.query(
      `SELECT id, appointment_time, duration_minutes FROM appointments
       WHERE salon_master_id = $1 AND status = 'confirmed'
         AND id != $2
         AND DATE(appointment_time) = DATE($3::timestamptz)`,
      [resolvedSalonMasterId, appointmentId, appointmentTime]
    );

    const hasOverlap = booked.rows.some((b) => {
      const bookedStart = new Date(b.appointment_time).getTime();
      const bookedEnd = bookedStart + (b.duration_minutes || 60) * 60000;
      return startMs < bookedEnd && endMs > bookedStart;
    });

    if (hasOverlap) {
      return res.status(409).json({ error: 'Время уже занято' });
    }

    await db.query(
      `UPDATE appointments
       SET salon_master_id = $1,
           service_name = $2,
           service_price = $3,
           appointment_time = $4,
           duration_minutes = $5,
           client_notes = $6
       WHERE id = $7 AND client_id = $8`,
      [
        resolvedSalonMasterId,
        serviceName,
        servicePrice,
        appointmentTime,
        durationMinutes,
        clientNotes || null,
        appointmentId,
        clientId
      ]
    );

    res.json({ success: true, appointmentId });
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    res.status(500).json({ error: 'Ошибка при переносе записи' });
  }
});

// Записи клиента: /my/:userId?channel=max|telegram
router.get('/my/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const channel = normalizeChannel(req.query.channel);
    const salonId = req.query.masterId ? resolveMasterId(req.query.masterId) : null;

    const clientId = await getClientByMessengerUserId(channel, userId);
    if (!clientId) {
      return res.json([]);
    }

    const appointments = await db.query(
      `SELECT a.*, m.name as master_name, m.address
       FROM appointments a
       JOIN masters m ON a.master_id = m.id
       WHERE a.client_id = $1 AND a.status = 'confirmed'
       AND ($2::uuid IS NULL OR a.master_id = $2::uuid)
       ORDER BY a.appointment_time`,
      [clientId, salonId]
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
    const { channel, maxUserId, telegramUserId, userId } = req.body;

    const messenger = normalizeChannel(channel);
    const messengerUserId = userId || (messenger === 'telegram' ? telegramUserId : maxUserId);

    const clientId = await getClientByMessengerUserId(messenger, messengerUserId);
    if (!clientId) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    const result = await db.query(
      `UPDATE appointments SET status = 'cancelled'
       WHERE id = $1 AND client_id = $2
       RETURNING id`,
      [appointmentId, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при отмене записи' });
  }
});

module.exports = router;

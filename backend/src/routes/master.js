const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { uploadsDir } = require('../config/paths');
const axios = require('axios');
const {
  buildMasterLinks,
  resolveMasterId,
  encodeMasterId,
  isResolvedMasterId,
  normalizeMaxBotUsername
} = require('../utils/links');
const {
  listSalonMasters,
  getSalonMasterById,
  getPriceGroupsForSalon
} = require('../utils/salonMasters');
const { resolveTeamMasterId } = require('../utils/teamContext');
const { buildStats } = require('../utils/clientStats');
const { formatClientDisplayName } = require('../utils/clientDisplay');
const { formatMasterPublicTitle } = require('../utils/masterDisplay');
const { buildSocialLinksFromRow, pickSocialPayload } = require('../utils/socialLinks');
const { upsertScheduleException } = require('../utils/scheduleExceptions');
const { sendMessengerNotification } = require('../utils/notify');
const { daysAgo, buildDailySeries } = require('../utils/analytics');
const {
  getOrCreateConversation,
  listMessages,
  addMessage,
  markClientMessagesRead
} = require('../utils/chat');
const {
  geocodeAddress,
  suggestAddress,
  buildYandexMapsLink,
  getApiKey
} = require('../utils/geocode');
const {
  normalizeClientTheme,
  listClientThemesCatalog,
  DEFAULT_CLIENT_THEME
} = require('../utils/clientThemes');
const {
  renderInviteMessage,
  getSalonInviteSettings,
  buildBookingLink,
  DEFAULT_MESSAGE
} = require('../utils/repeatInvite');
const { queryWithColumnFallback } = require('../utils/safeQuery');
const {
  getMasterBillingRow,
  formatBillingState,
  isBillingEnabled,
  listBillingTransactions,
  setAutoRenew,
  MIN_TOPUP,
  UNLIMITED_PRICE,
  getBillingConfig
} = require('../utils/billing');
const { createPayment, isYookassaConfigured } = require('../utils/yookassa');

const router = express.Router();

function buildClientWebUrl(masterId, channel, userId, tab = 'booking') {
  const base = (process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const params = new URLSearchParams({ ch: channel, uid: String(userId) });
  if (tab) params.set('tab', tab);
  return `${base}/m/${encodeMasterId(masterId)}?${params.toString()}`;
}

// Middleware для проверки авторизации
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

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 60 * 1024 * 1024 } }); // фото и короткие видео

const uploadVideoReel = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('video/')) cb(null, true);
    else cb(new Error('Допустимы только видеофайлы'));
  }
});

// --- Мастера салона (исполнители) ---
router.get('/me/salon-masters', authMiddleware, async (req, res) => {
  try {
    const rows = await listSalonMasters(req.masterId);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении мастеров' });
  }
});

router.post('/me/salon-masters', authMiddleware, async (req, res) => {
  try {
    const { name, specialty, description, slot_step_minutes, sort_order, is_active, photo_url } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Укажите имя мастера' });
    }
    const id = uuidv4();
    await db.query(
      `INSERT INTO salon_masters (id, salon_id, name, specialty, description, photo_url, slot_step_minutes, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        req.masterId,
        name.trim(),
        specialty || null,
        description || null,
        photo_url || null,
        slot_step_minutes || 60,
        sort_order ?? 0,
        is_active !== false
      ]
    );
    res.status(201).json({ id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при создании мастера' });
  }
});

router.put('/me/salon-masters/:id', authMiddleware, async (req, res) => {
  try {
    const row = await getSalonMasterById(req.params.id, req.masterId);
    if (!row) return res.status(404).json({ error: 'Мастер не найден' });

    const { name, specialty, description, slot_step_minutes, sort_order, is_active, photo_url } = req.body;
    await db.query(
      `UPDATE salon_masters SET
        name = COALESCE($1, name),
        specialty = COALESCE($2, specialty),
        description = COALESCE($3, description),
        photo_url = COALESCE($4, photo_url),
        slot_step_minutes = COALESCE($5, slot_step_minutes),
        sort_order = COALESCE($6, sort_order),
        is_active = COALESCE($7, is_active)
       WHERE id = $8 AND salon_id = $9`,
      [name, specialty, description, photo_url, slot_step_minutes, sort_order, is_active, req.params.id, req.masterId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении мастера' });
  }
});

router.post('/me/salon-masters/:id/photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const row = await getSalonMasterById(req.params.id, req.masterId);
    if (!row) return res.status(404).json({ error: 'Мастер не найден' });
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });

    const photo_url = `/uploads/${req.file.filename}`;
    await db.query('UPDATE salon_masters SET photo_url = $1 WHERE id = $2', [photo_url, req.params.id]);
    res.json({ photo_url });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки фото' });
  }
});

router.delete('/me/salon-masters/:id', authMiddleware, async (req, res) => {
  try {
    const row = await getSalonMasterById(req.params.id, req.masterId);
    if (!row) return res.status(404).json({ error: 'Мастер не найден' });

    const count = await db.query(
      `SELECT COUNT(*)::int AS c FROM salon_masters WHERE salon_id = $1 AND is_active = TRUE`,
      [req.masterId]
    );
    if (count.rows[0].c <= 1) {
      return res.status(400).json({ error: 'Нельзя удалить единственного мастера' });
    }

    await db.query('UPDATE salon_masters SET is_active = FALSE WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении мастера' });
  }
});

router.delete('/me/salon-masters/:id/permanent', authMiddleware, async (req, res) => {
  try {
    const row = await getSalonMasterById(req.params.id, req.masterId);
    if (!row) return res.status(404).json({ error: 'Мастер не найден' });

    const futureAppointments = await db.query(
      `SELECT COUNT(*)::int AS c FROM appointments
       WHERE salon_master_id = $1 AND appointment_time > NOW() AND status != 'cancelled'`,
      [req.params.id]
    );
    if (futureAppointments.rows[0].c > 0) {
      return res.status(400).json({
        error: `У мастера ${futureAppointments.rows[0].c} будущих записей. Сначала отмените или завершите их в разделе «Записи».`
      });
    }

    await db.query('DELETE FROM salon_masters WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Permanent delete master error:', error);
    res.status(500).json({ error: 'Ошибка при удалении мастера' });
  }
});

// Получить данные мастера (публичные)
router.get('/:masterId', async (req, res) => {
  try {
    const masterId = resolveMasterId(req.params.masterId);
    if (!isResolvedMasterId(masterId)) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const master = await queryWithColumnFallback(
      db,
      `SELECT id, name, last_name, salon_name, logo_url, description, phone, address,
              latitude, longitude, yandex_maps_link, client_theme,
              social_telegram, social_instagram, social_vk, social_website, social_max,
              video_reel_url
       FROM masters WHERE id = $1`,
      `SELECT id, name, salon_name, logo_url, description, phone, address,
              latitude, longitude, yandex_maps_link
       FROM masters WHERE id = $1`,
      [masterId]
    );

    if (master.rows.length === 0) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const teamMasters = await listSalonMasters(masterId, { activeOnly: true });
    const priceGroups = await getPriceGroupsForSalon(masterId);
    const priceList = priceGroups.flatMap((g) =>
      g.services.map((s) => ({ ...s, salon_master_id: g.master.id }))
    );

    const portfolio = await queryWithColumnFallback(
      db,
      `SELECT id, image_url, media_type, video_url, thumbnail_url, title, salon_master_id, sort_order
       FROM portfolio WHERE master_id = $1 ORDER BY sort_order`,
      `SELECT id, image_url, media_type, video_url, thumbnail_url, title, sort_order
       FROM portfolio WHERE master_id = $1 ORDER BY sort_order`,
      [masterId]
    );

    const reviewStats = await db.query(
      `SELECT COUNT(*)::int AS count,
              ROUND(AVG(rating)::numeric, 1) AS average
       FROM reviews WHERE salon_id = $1 AND is_published = TRUE`,
      [masterId]
    );
    const recentReviews = await queryWithColumnFallback(
      db,
      `SELECT r.id, r.rating, r.body, r.client_name, r.salon_reply, r.photo_urls, r.created_at,
              sm.name AS salon_master_name
       FROM reviews r
       LEFT JOIN salon_masters sm ON r.salon_master_id = sm.id
       WHERE r.salon_id = $1 AND r.is_published = TRUE
       ORDER BY r.created_at DESC LIMIT 20`,
      `SELECT r.id, r.rating, r.body, r.client_name, r.salon_reply, r.created_at,
              sm.name AS salon_master_name
       FROM reviews r
       LEFT JOIN salon_masters sm ON r.salon_master_id = sm.id
       WHERE r.salon_id = $1 AND r.is_published = TRUE
       ORDER BY r.created_at DESC LIMIT 20`,
      [masterId]
    );

    const masterRow = master.rows[0];
    const socialLinks = buildSocialLinksFromRow(masterRow);
    let billingState = null;
    if (isBillingEnabled()) {
      try {
        const billingRow = await getMasterBillingRow(masterId);
        if (billingRow) billingState = formatBillingState(billingRow);
      } catch (billingErr) {
        console.error('Billing lookup skipped for public master page:', billingErr.message);
      }
    }
    const {
      social_telegram: _st,
      social_instagram: _si,
      social_vk: _sv,
      social_website: _sw,
      social_max: _sm,
      ...masterPublic
    } = masterRow;
    res.json({
      master: {
        ...masterPublic,
        socialLinks,
        client_theme: normalizeClientTheme(masterRow.client_theme),
        display_title: formatMasterPublicTitle(masterRow)
      },
      teamMasters,
      priceGroups,
      portfolio: portfolio.rows,
      priceList,
      reviewSummary: {
        count: reviewStats.rows[0]?.count || 0,
        average: Number(reviewStats.rows[0]?.average) || null
      },
      reviews: recentReviews.rows,
      booking: {
        telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || null,
        telegramBotDeepLink: process.env.TELEGRAM_BOT_USERNAME
          ? `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=ref_${encodeMasterId(masterId)}`
          : null,
        maxBotDeepLink: (() => {
          const u = normalizeMaxBotUsername(process.env.MAX_BOT_USERNAME);
          return u ? `https://max.ru/${u}?start=ref_${encodeMasterId(masterId)}` : null;
        })(),
        billingEnabled: isBillingEnabled(),
        onlineBookingAllowed: billingState ? billingState.online_booking_allowed : true,
        onlineBookingBlockReason: billingState?.online_booking_block_reason || null
      }
    });
  } catch (error) {
    console.error('Error fetching master:', error);
    res.status(500).json({ error: 'Ошибка при получении данных' });
  }
});

// Получить свои данные (авторизованный мастер)
router.get('/me/profile', authMiddleware, async (req, res) => {
  try {
    const result = await queryWithColumnFallback(
      db,
      `SELECT id, email, name, last_name, salon_name, logo_url, description, phone,
              address, latitude, longitude, yandex_maps_link, client_theme, created_at,
              social_telegram, social_instagram, social_vk, social_website, social_max,
              video_reel_url
       FROM masters WHERE id = $1`,
      `SELECT id, email, name, last_name, salon_name, logo_url, description, phone,
              address, latitude, longitude, yandex_maps_link, created_at
       FROM masters WHERE id = $1`,
      [req.masterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const row = result.rows[0];
    res.json({
      ...row,
      client_theme: normalizeClientTheme(row.client_theme)
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении профиля' });
  }
});

router.get('/me/client-themes', authMiddleware, (_req, res) => {
  res.json({ themes: listClientThemesCatalog(), defaultTheme: DEFAULT_CLIENT_THEME });
});

router.put('/me/client-theme', authMiddleware, async (req, res) => {
  try {
    const theme = normalizeClientTheme(req.body?.client_theme);
    await db.query(
      'UPDATE masters SET client_theme = $1, updated_at = NOW() WHERE id = $2',
      [theme, req.masterId]
    );
    res.json({ success: true, client_theme: theme });
  } catch (error) {
    console.error('client-theme:', error);
    res.status(500).json({ error: 'Не удалось сохранить тему' });
  }
});

// Подсказки адреса (Яндекс)
router.get('/me/address-suggest', authMiddleware, async (req, res) => {
  try {
    const suggestions = await suggestAddress(req.query.q);
    res.json({ suggestions, configured: true });
  } catch (error) {
    console.error('address-suggest:', error);
    res.status(500).json({ error: 'Не удалось получить подсказки адреса' });
  }
});

// Геокодирование выбранного адреса
router.post('/me/geocode', authMiddleware, async (req, res) => {
  try {
    const geo = await geocodeAddress(req.body?.address);
    if (!geo) {
      return res.status(404).json({ error: 'Адрес не найден. Выберите вариант из подсказок.' });
    }
    res.json({
      ...geo,
      yandex_maps_link: buildYandexMapsLink(geo.latitude, geo.longitude)
    });
  } catch (error) {
    console.error('geocode:', error);
    res.status(500).json({ error: 'Ошибка геокодирования' });
  }
});

// Обновить профиль мастера
router.put('/me/profile', authMiddleware, async (req, res) => {
  try {
    let { name, last_name, salon_name, description, phone, address, latitude, longitude, yandex_maps_link } = req.body;

    const current = await db.query(
      'SELECT address, latitude, longitude FROM masters WHERE id = $1',
      [req.masterId]
    );
    const prev = current.rows[0] || {};

    const addressChanged = address != null && String(address).trim() !== String(prev.address || '').trim();
    const needsGeocode =
      address &&
      (addressChanged || latitude == null || longitude == null || !prev.latitude || !prev.longitude);

    if (needsGeocode) {
      const geo = await geocodeAddress(address);
      if (geo) {
        address = geo.address;
        latitude = geo.latitude;
        longitude = geo.longitude;
        yandex_maps_link = buildYandexMapsLink(geo.latitude, geo.longitude);
      }
    } else if (latitude != null && longitude != null && !yandex_maps_link) {
      yandex_maps_link = buildYandexMapsLink(latitude, longitude);
    }

    const social = pickSocialPayload(req.body);
    const hasSocial = Object.keys(social).length > 0;

    if (hasSocial) {
      await db.query(
        `UPDATE masters SET
          name = COALESCE($1, name),
          last_name = COALESCE($2, last_name),
          salon_name = COALESCE($3, salon_name),
          description = COALESCE($4, description),
          phone = COALESCE($5, phone),
          address = COALESCE($6, address),
          latitude = COALESCE($7, latitude),
          longitude = COALESCE($8, longitude),
          yandex_maps_link = COALESCE($9, yandex_maps_link),
          social_telegram = $11,
          social_instagram = $12,
          social_vk = $13,
          social_website = $14,
          social_max = $15,
          updated_at = NOW()
         WHERE id = $10`,
        [
          name,
          last_name,
          salon_name,
          description,
          phone,
          address,
          latitude,
          longitude,
          yandex_maps_link,
          req.masterId,
          social.social_telegram ?? null,
          social.social_instagram ?? null,
          social.social_vk ?? null,
          social.social_website ?? null,
          social.social_max ?? null
        ]
      );
    } else {
      await db.query(
        `UPDATE masters SET
          name = COALESCE($1, name),
          last_name = COALESCE($2, last_name),
          salon_name = COALESCE($3, salon_name),
          description = COALESCE($4, description),
          phone = COALESCE($5, phone),
          address = COALESCE($6, address),
          latitude = COALESCE($7, latitude),
          longitude = COALESCE($8, longitude),
          yandex_maps_link = COALESCE($9, yandex_maps_link),
          updated_at = NOW()
         WHERE id = $10`,
        [name, last_name, salon_name, description, phone, address, latitude, longitude, yandex_maps_link, req.masterId]
      );
    }

    const updated = await db.query(
      `SELECT address, latitude, longitude, yandex_maps_link FROM masters WHERE id = $1`,
      [req.masterId]
    );

    res.json({ success: true, ...updated.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении профиля' });
  }
});

// Загрузить логотип
router.post('/me/logo', authMiddleware, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const logo_url = `/uploads/${req.file.filename}`;
    await db.query('UPDATE masters SET logo_url = $1, updated_at = NOW() WHERE id = $2', [logo_url, req.masterId]);

    res.json({ logo_url });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке логотипа' });
  }
});

// Видеовизитка (вертикальное видео 9:16, до 50 МБ)
router.post('/me/video-reel', authMiddleware, uploadVideoReel.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    const video_reel_url = `/uploads/${req.file.filename}`;
    await db.query(
      'UPDATE masters SET video_reel_url = $1, updated_at = NOW() WHERE id = $2',
      [video_reel_url, req.masterId]
    );
    res.json({ video_reel_url });
  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Максимальный размер видео — 50 МБ' });
    }
    console.error('video-reel upload:', error);
    res.status(500).json({ error: error.message || 'Ошибка при загрузке видеовизитки' });
  }
});

router.delete('/me/video-reel', authMiddleware, async (req, res) => {
  try {
    await db.query(
      'UPDATE masters SET video_reel_url = NULL, updated_at = NOW() WHERE id = $1',
      [req.masterId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('video-reel delete:', error);
    res.status(500).json({ error: 'Ошибка при удалении видеовизитки' });
  }
});

// Получить расписание работы
router.get('/me/schedule', authMiddleware, async (req, res) => {
  try {
    const salonMasterId = await resolveTeamMasterId(req.masterId, req.query.salonMasterId);
    const result = await db.query(
      'SELECT * FROM work_schedule WHERE salon_master_id = $1 ORDER BY day_of_week',
      [salonMasterId]
    );
    res.json(result.rows);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при получении расписания' });
  }
});

// Сохранить расписание работы
router.post('/me/schedule', authMiddleware, async (req, res) => {
  try {
    const { schedule, salonMasterId: bodySalonMasterId } = req.body;
    const salonMasterId = await resolveTeamMasterId(req.masterId, bodySalonMasterId);

    if (!salonMasterId) {
      return res.status(400).json({ error: 'Мастер салона не найден. Обратитесь в поддержку.' });
    }

    // Delete by master_id since unique constraint is on (master_id, day_of_week)
    await db.query('DELETE FROM work_schedule WHERE master_id = $1', [req.masterId]);

    for (const day of schedule) {
      await db.query(
        `INSERT INTO work_schedule (id, master_id, salon_master_id, day_of_week, start_time, end_time, is_day_off)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), req.masterId, salonMasterId, day.day_of_week, day.start_time, day.end_time, day.is_day_off || false]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving schedule:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при сохранении расписания' });
  }
});

// Получить исключения в расписании
router.get('/me/exceptions', authMiddleware, async (req, res) => {
  try {
    const salonMasterId = await resolveTeamMasterId(req.masterId, req.query.salonMasterId);
    const result = await db.query(
      'SELECT * FROM schedule_exceptions WHERE salon_master_id = $1 ORDER BY exception_date',
      [salonMasterId]
    );
    res.json(result.rows);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при получении исключений' });
  }
});

// Добавить исключение
router.post('/me/exceptions', authMiddleware, async (req, res) => {
  try {
    const { exception_date, is_working, start_time, end_time, salonMasterId: bodySalonMasterId } = req.body;
    console.log('[exception save] bodySalonMasterId:', bodySalonMasterId);
    const salonMasterId = await resolveTeamMasterId(req.masterId, bodySalonMasterId);
    console.log('[exception save] resolved salonMasterId:', salonMasterId, 'exception_date:', exception_date, 'is_working:', is_working);

    await upsertScheduleException(db, {
      masterId: req.masterId,
      salonMasterId,
      exception_date,
      is_working,
      start_time,
      end_time
    });

    res.json({ success: true });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при добавлении исключения' });
  }
});

// Массово: выходные или снять отметки
router.post('/me/exceptions/bulk', authMiddleware, async (req, res) => {
  try {
    const { dates, action = 'set_closed', salonMasterId: bodySalonMasterId } = req.body;
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'Укажите массив dates' });
    }
    if (dates.length > 366) {
      return res.status(400).json({ error: 'Слишком много дат за один раз' });
    }

    const salonMasterId = await resolveTeamMasterId(req.masterId, bodySalonMasterId);
    const normalized = [...new Set(dates.map((d) => String(d).slice(0, 10)))].filter((d) =>
      /^\d{4}-\d{2}-\d{2}$/.test(d)
    );

    if (action === 'remove') {
      await db.query(
        `DELETE FROM schedule_exceptions
         WHERE salon_master_id = $1 AND exception_date = ANY($2::date[])`,
        [salonMasterId, normalized]
      );
      return res.json({ success: true, count: normalized.length, action: 'remove' });
    }

    for (const exception_date of normalized) {
      await upsertScheduleException(db, {
        masterId: req.masterId,
        salonMasterId,
        exception_date,
        is_working: false,
        start_time: null,
        end_time: null
      });
    }

    res.json({ success: true, count: normalized.length, action: 'set_closed' });
  } catch (error) {
    console.error('exceptions bulk:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка массового сохранения' });
  }
});

// Удалить исключение
router.delete('/me/exceptions/:id', authMiddleware, async (req, res) => {
  try {
    const salonMasterId = await resolveTeamMasterId(req.masterId, req.query.salonMasterId);
    await db.query(
      'DELETE FROM schedule_exceptions WHERE id = $1 AND salon_master_id = $2',
      [req.params.id, salonMasterId]
    );
    res.json({ success: true });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при удалении исключения' });
  }
});

// Получить прайс-лист
router.get('/me/prices', authMiddleware, async (req, res) => {
  try {
    const salonMasterId = await resolveTeamMasterId(req.masterId, req.query.salonMasterId);
    const result = await db.query(
      'SELECT * FROM price_items WHERE salon_master_id = $1 ORDER BY sort_order',
      [salonMasterId]
    );
    res.json(result.rows);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при получении прайс-листа' });
  }
});

// Добавить/обновить позицию прайс-листа
router.post('/me/prices', authMiddleware, async (req, res) => {
  try {
    const {
      id,
      name,
      price,
      price_max,
      price_type,
      duration_minutes,
      image_url,
      sort_order,
      is_active,
      salonMasterId: bodySalonMasterId
    } = req.body;
    const salonMasterId = await resolveTeamMasterId(req.masterId, bodySalonMasterId);

    const type = ['fixed', 'from', 'to', 'range'].includes(price_type) ? price_type : 'fixed';
    const priceNum = Number(price);
    const priceMaxNum = price_max != null && price_max !== '' ? Number(price_max) : null;

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'Укажите корректную стоимость' });
    }
    if (type === 'range') {
      if (!Number.isFinite(priceMaxNum) || priceMaxNum < priceNum) {
        return res.status(400).json({ error: 'Для диапазона укажите «до» больше или равно «от»' });
      }
    }

    const storedMax = type === 'range' ? priceMaxNum : null;

    if (id) {
      await db.query(
        `UPDATE price_items SET name = $1, price = $2, price_max = $3, price_type = $4, duration_minutes = $5,
         image_url = $6, sort_order = $7, is_active = $8 WHERE id = $9 AND salon_master_id = $10`,
        [name, priceNum, storedMax, type, duration_minutes, image_url, sort_order || 0, is_active !== false, id, salonMasterId]
      );
    } else {
      await db.query(
        `INSERT INTO price_items (id, master_id, salon_master_id, name, price, price_max, price_type, duration_minutes, image_url, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [uuidv4(), req.masterId, salonMasterId, name, priceNum, storedMax, type, duration_minutes, image_url, sort_order || 0, is_active !== false]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving price:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при сохранении прайс-листа' });
  }
});

// Удалить позицию прайс-листа
router.delete('/me/prices/:id', authMiddleware, async (req, res) => {
  try {
    const salonMasterId = await resolveTeamMasterId(req.masterId, req.query.salonMasterId);
    await db.query('DELETE FROM price_items WHERE id = $1 AND salon_master_id = $2', [req.params.id, salonMasterId]);
    res.json({ success: true });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при удалении позиции' });
  }
});

// Загрузить фото для прайс-листа
router.post('/me/prices/upload', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    res.json({ image_url: `/uploads/${req.file.filename}` });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке фото' });
  }
});

// Получить портфолио
router.get('/me/portfolio', authMiddleware, async (req, res) => {
  try {
    const salonMasterId = await resolveTeamMasterId(req.masterId, req.query.salonMasterId);
    const result = await db.query(
      'SELECT * FROM portfolio WHERE salon_master_id = $1 ORDER BY sort_order',
      [salonMasterId]
    );
    res.json(result.rows);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при получении портфолио' });
  }
});

// Добавить медиа на главную страницу клиента
router.post('/me/portfolio', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    const { title, sort_order, salonMasterId: bodySalonMasterId, media_type, video_url } = req.body;
    const salonMasterId = await resolveTeamMasterId(req.masterId, bodySalonMasterId);
    const existingVideos = await db.query(
      `SELECT COUNT(*)::int AS count FROM portfolio
       WHERE master_id = $1
         AND media_type IN ('video', 'external_video')`,
      [req.masterId]
    );

    const requestedType = media_type || (req.file?.mimetype?.startsWith('video/') ? 'video' : 'image');
    const isVideo = requestedType === 'video' || requestedType === 'external_video';
    if (isVideo && existingVideos.rows[0].count >= 10) {
      return res.status(400).json({ error: 'Можно добавить не больше 10 коротких видео' });
    }

    if (requestedType === 'external_video' && !video_url?.trim()) {
      return res.status(400).json({ error: 'Укажите ссылку на видео' });
    }
    if (requestedType !== 'external_video' && !req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const file_url = req.file ? `/uploads/${req.file.filename}` : null;
    const image_url = requestedType === 'image' ? file_url : null;
    const finalVideoUrl = requestedType === 'video' ? file_url : video_url?.trim() || null;

    await db.query(
      `INSERT INTO portfolio (id, master_id, salon_master_id, image_url, media_type, video_url, title, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), req.masterId, salonMasterId, image_url, requestedType, finalVideoUrl, title, sort_order || 0]
    );

    res.json({ success: true, image_url, video_url: finalVideoUrl, media_type: requestedType });
  } catch (error) {
    console.error(error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при добавлении медиа' });
  }
});

// Удалить фото из портфолио
router.delete('/me/portfolio/:id', authMiddleware, async (req, res) => {
  try {
    const salonMasterId = await resolveTeamMasterId(req.masterId, req.query.salonMasterId);
    await db.query('DELETE FROM portfolio WHERE id = $1 AND salon_master_id = $2', [req.params.id, salonMasterId]);
    res.json({ success: true });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при удалении фото' });
  }
});

// Получить всех клиентов салона (с краткой статистикой)
router.get('/me/clients', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.photo_url, c.phone AS client_phone, c.messenger, c.max_user_id, c.telegram_user_id, c.created_at,
              scp.first_name, scp.last_name, scp.patronymic, scp.phone AS profile_phone, scp.notes,
              COUNT(a.id) FILTER (WHERE a.status != 'cancelled')::int AS visit_count,
              COUNT(a.id) FILTER (WHERE a.status = 'completed')::int AS completed_count,
              MAX(a.appointment_time) FILTER (WHERE a.status != 'cancelled') AS last_visit,
              COALESCE(SUM(a.service_price) FILTER (WHERE a.status IN ('confirmed', 'completed')), 0)::numeric AS total_spent
       FROM clients c
       LEFT JOIN salon_client_profiles scp ON scp.client_id = c.id AND scp.salon_id = $1
       LEFT JOIN appointments a ON a.client_id = c.id AND a.master_id = $1
       WHERE (scp.salon_id = $1 OR a.id IS NOT NULL)
         AND COALESCE(scp.deleted_at, 'epoch'::timestamp) = 'epoch'::timestamp
       GROUP BY c.id, c.name, c.photo_url, c.phone, c.messenger, c.max_user_id, c.telegram_user_id, c.created_at,
                scp.first_name, scp.last_name, scp.patronymic, scp.phone, scp.notes
       ORDER BY last_visit DESC NULLS LAST, c.created_at DESC, c.name`,
      [req.masterId]
    );
    const rows = result.rows.map((row) => ({
      ...row,
      display_name: formatClientDisplayName({
        first_name: row.first_name,
        last_name: row.last_name,
        patronymic: row.patronymic,
        name: row.name
      }),
      phone: row.profile_phone || row.client_phone
    }));
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении клиентов' });
  }
});

// Карточка клиента: история визитов и статистика
router.get('/me/clients/:clientId', authMiddleware, async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await db.query(
      `SELECT c.*,
              scp.first_name, scp.last_name, scp.patronymic,
              scp.phone AS profile_phone, scp.notes AS salon_notes
       FROM clients c
       LEFT JOIN salon_client_profiles scp ON scp.client_id = c.id AND scp.salon_id = $2
       WHERE c.id = $1`,
      [clientId, req.masterId]
    );

    if (client.rows.length === 0) {
      return res.status(404).json({ error: 'Клиент не найден' });
    }

    const hasAccess = await db.query(
      `SELECT 1 FROM salon_client_profiles
       WHERE salon_id = $1 AND client_id = $2 AND deleted_at IS NULL
       UNION
       SELECT 1 FROM appointments WHERE master_id = $1 AND client_id = $2
       LIMIT 1`,
      [req.masterId, clientId]
    );

    if (hasAccess.rows.length === 0) {
      return res.status(404).json({ error: 'Клиент не найден' });
    }

    const history = await db.query(
      `SELECT a.id, a.service_name, a.service_price, a.appointment_time, a.duration_minutes,
              a.status, a.client_notes, a.created_at, sm.name AS salon_master_name
       FROM appointments a
       LEFT JOIN salon_masters sm ON a.salon_master_id = sm.id
       WHERE a.master_id = $1 AND a.client_id = $2
       ORDER BY a.appointment_time DESC`,
      [req.masterId, clientId]
    );

    const row = client.rows[0];
    const displayName = formatClientDisplayName({
      first_name: row.first_name,
      last_name: row.last_name,
      patronymic: row.patronymic,
      name: row.name
    });

    res.json({
      client: {
        ...row,
        display_name: displayName,
        phone: row.profile_phone || row.phone,
        can_message: !!(row.max_user_id || row.telegram_user_id)
      },
      stats: buildStats(history.rows),
      appointments: history.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении карточки клиента' });
  }
});

// Карточка клиента: ФИО, телефон, заметки
router.put('/me/clients/:clientId', authMiddleware, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { notes, first_name, last_name, patronymic, phone } = req.body;

    const hasAccess = await db.query(
      `SELECT 1 FROM salon_client_profiles
       WHERE salon_id = $1 AND client_id = $2 AND deleted_at IS NULL
       UNION
       SELECT 1 FROM appointments WHERE master_id = $1 AND client_id = $2
       LIMIT 1`,
      [req.masterId, clientId]
    );

    if (hasAccess.rows.length === 0) {
      return res.status(404).json({ error: 'Клиент не найден' });
    }

    const fName = first_name?.trim() || null;
    const lName = last_name?.trim() || null;
    const patr = patronymic?.trim() || null;
    const phoneVal = phone?.trim() || null;
    const displayName = formatClientDisplayName({
      first_name: fName,
      last_name: lName,
      patronymic: patr,
      name: null
    });

    await db.query(
      `INSERT INTO salon_client_profiles (salon_id, client_id, first_name, last_name, patronymic, phone, notes, deleted_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NOW())
       ON CONFLICT (salon_id, client_id)
       DO UPDATE SET
         first_name = $3,
         last_name = $4,
         patronymic = $5,
         phone = $6,
         notes = $7,
         deleted_at = NULL,
         updated_at = NOW()`,
      [req.masterId, clientId, fName, lName, patr, phoneVal, notes ?? null]
    );

    if (displayName !== 'Без имени' || phoneVal) {
      await db.query(
        `UPDATE clients SET
          name = COALESCE($1, name),
          phone = COALESCE($2, phone)
         WHERE id = $3`,
        [displayName !== 'Без имени' ? displayName : null, phoneVal, clientId]
      );
    }

    res.json({
      success: true,
      display_name: displayName !== 'Без имени' ? displayName : undefined
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при сохранении карточки' });
  }
});

// Удалить клиента из базы салона (история записей сохраняется)
router.delete('/me/clients/:clientId', authMiddleware, async (req, res) => {
  try {
    const { clientId } = req.params;

    const exists = await db.query(
      `SELECT 1 FROM salon_client_profiles
       WHERE salon_id = $1 AND client_id = $2
       UNION
       SELECT 1 FROM appointments WHERE master_id = $1 AND client_id = $2
       LIMIT 1`,
      [req.masterId, clientId]
    );

    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Клиент не найден' });
    }

    await db.query(
      `INSERT INTO salon_client_profiles (salon_id, client_id, deleted_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (salon_id, client_id)
       DO UPDATE SET deleted_at = NOW(), updated_at = NOW()`,
      [req.masterId, clientId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при удалении клиента' });
  }
});

router.post('/me/clients/:clientId/message', authMiddleware, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Введите текст сообщения' });
    }

    const hasAccess = await db.query(
      `SELECT 1 FROM salon_client_profiles
       WHERE salon_id = $1 AND client_id = $2 AND deleted_at IS NULL
       UNION
       SELECT 1 FROM appointments WHERE master_id = $1 AND client_id = $2
       LIMIT 1`,
      [req.masterId, clientId]
    );
    if (hasAccess.rows.length === 0) {
      return res.status(404).json({ error: 'Клиент не найден' });
    }

    const client = await db.query(
      `SELECT messenger, max_user_id, telegram_user_id FROM clients WHERE id = $1`,
      [clientId]
    );

    const c = client.rows[0];
    const notifyText = `💬 Сообщение от салона:\n\n${message.trim()}`;
    const notifyOpts = {};
    if (c.telegram_user_id) {
      notifyOpts.replyUrl = buildClientWebUrl(req.masterId, 'telegram', c.telegram_user_id, 'chat');
      notifyOpts.replyText = 'Ответить мастеру';
    } else if (c.max_user_id) {
      notifyOpts.replyUrl = buildClientWebUrl(req.masterId, 'max', c.max_user_id, 'chat');
      notifyOpts.replyText = 'Ответить мастеру';
    }
    const sent = await sendMessengerNotification(c, notifyText, notifyOpts);
    if (!sent) {
      return res.status(400).json({ error: 'У клиента нет ID мессенджера' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при отправке сообщения' });
  }
});

// Рассылка клиентам
router.post('/me/broadcast', authMiddleware, async (req, res) => {
  try {
    const { message, client_ids } = req.body;

    let clients;
    if (client_ids && client_ids.length > 0) {
      clients = await db.query(
        `SELECT id, messenger, max_user_id, telegram_user_id FROM clients
         WHERE id = ANY($1) AND (max_user_id IS NOT NULL OR telegram_user_id IS NOT NULL)`,
        [client_ids]
      );
    } else {
      clients = await db.query(
        `SELECT c.id, c.messenger, c.max_user_id, c.telegram_user_id FROM clients c
         JOIN appointments a ON a.client_id = c.id
         WHERE a.master_id = $1
         AND (c.max_user_id IS NOT NULL OR c.telegram_user_id IS NOT NULL)`,
        [req.masterId]
      );
    }

    const maxBotUrl = process.env.MAX_BOT_URL || 'http://localhost:3001';
    const telegramBotUrl = process.env.TELEGRAM_BOT_URL || 'http://localhost:3002';
    let sent = 0;

    for (const client of clients.rows) {
      try {
        if (client.messenger === 'telegram' && client.telegram_user_id) {
          await axios.post(`${telegramBotUrl}/notify`, {
            telegramUserId: client.telegram_user_id,
            message,
            replyUrl: buildClientWebUrl(req.masterId, 'telegram', client.telegram_user_id, 'chat'),
            replyText: 'Ответить мастеру'
          });
          sent++;
        } else if (client.max_user_id) {
          await axios.post(`${maxBotUrl}/notify`, {
            maxUserId: client.max_user_id,
            message,
            replyUrl: buildClientWebUrl(req.masterId, 'max', client.max_user_id, 'chat'),
            replyText: 'Ответить мастеру'
          });
          sent++;
        }
      } catch (err) {
        console.error('Broadcast error for client', client.id, err.message);
      }
    }

    res.json({ success: true, recipients: sent });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при отправке рассылки' });
  }
});

// Счётчики для меню (чат, модерация отзывов)
router.get('/me/nav-badges', authMiddleware, async (req, res) => {
  try {
    const chat = await db.query(
      `SELECT COUNT(*)::int AS unread FROM messages m
       JOIN conversations cv ON m.conversation_id = cv.id
       WHERE cv.salon_id = $1 AND m.sender_type = 'client' AND m.read_at IS NULL`,
      [req.masterId]
    );
    const reviews = await db.query(
      `SELECT COUNT(*)::int AS pending FROM reviews
       WHERE salon_id = $1 AND is_published = FALSE`,
      [req.masterId]
    );
    res.json({
      chatUnread: chat.rows[0]?.unread || 0,
      reviewsPending: reviews.rows[0]?.pending || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.get('/me/notify-settings', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT social_telegram, social_max, phone
       FROM masters WHERE id = $1`,
      [req.masterId]
    );
    res.json({
      contact_telegram: result.rows[0]?.social_telegram || '',
      contact_max: result.rows[0]?.social_max || '',
      contact_phone: result.rows[0]?.phone || ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.put('/me/notify-settings', authMiddleware, async (req, res) => {
  try {
    const { contact_telegram, contact_max, contact_phone } = req.body;
    await db.query(
      `UPDATE masters SET
        social_telegram = $1,
        social_max = $2,
        phone = $3
       WHERE id = $4`,
      [
        contact_telegram?.trim() || null,
        contact_max?.trim() || null,
        contact_phone?.trim() || null,
        req.masterId
      ]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

// --- Отзывы ---
router.get('/me/reviews', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, sm.name AS salon_master_name, c.name AS client_db_name
       FROM reviews r
       LEFT JOIN salon_masters sm ON r.salon_master_id = sm.id
       LEFT JOIN clients c ON r.client_id = c.id
       WHERE r.salon_id = $1
       ORDER BY r.created_at DESC`,
      [req.masterId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении отзывов' });
  }
});

router.put('/me/reviews/:id', authMiddleware, async (req, res) => {
  try {
    const { is_published, salon_reply } = req.body;
    const result = await db.query(
      `UPDATE reviews SET
        is_published = COALESCE($1, is_published),
        salon_reply = COALESCE($2, salon_reply)
       WHERE id = $3 AND salon_id = $4 RETURNING id`,
      [is_published, salon_reply, req.params.id, req.masterId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Отзыв не найден' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении отзыва' });
  }
});

// --- Чат (общий inbox салона) ---
router.get('/me/conversations', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT cv.id, cv.client_id, cv.last_message_at, cv.created_at,
              c.name AS client_name, c.phone, c.messenger,
              (SELECT body FROM messages m WHERE m.conversation_id = cv.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*)::int FROM messages m
               WHERE m.conversation_id = cv.id AND m.sender_type = 'client' AND m.read_at IS NULL) AS unread_count
       FROM conversations cv
       JOIN clients c ON cv.client_id = c.id
       WHERE cv.salon_id = $1
       ORDER BY cv.last_message_at DESC NULLS LAST, cv.created_at DESC`,
      [req.masterId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при загрузке чатов' });
  }
});

router.get('/me/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const conv = await db.query(
      'SELECT id FROM conversations WHERE id = $1 AND salon_id = $2',
      [req.params.conversationId, req.masterId]
    );
    if (conv.rows.length === 0) return res.status(404).json({ error: 'Диалог не найден' });

    await markClientMessagesRead(req.params.conversationId);
    const messages = await listMessages(req.params.conversationId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке сообщений' });
  }
});

router.post('/me/conversations/:conversationId/messages', authMiddleware, async (req, res) => {
  try {
    const { body: text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Введите сообщение' });

    const conv = await db.query(
      `SELECT c.messenger, c.max_user_id, c.telegram_user_id
       FROM conversations cv
       JOIN clients c ON cv.client_id = c.id
       WHERE cv.id = $1 AND cv.salon_id = $2`,
      [req.params.conversationId, req.masterId]
    );
    if (conv.rows.length === 0) return res.status(404).json({ error: 'Диалог не найден' });

    await addMessage(req.params.conversationId, 'salon', text.trim());

    const c = conv.rows[0];
    const notifyText = `💬 Сообщение от салона:\n\n${text.trim()}`;
    const notifyOpts = {};
    if (c.telegram_user_id) {
      notifyOpts.replyUrl = buildClientWebUrl(req.masterId, 'telegram', c.telegram_user_id, 'chat');
      notifyOpts.replyText = 'Ответить мастеру';
    } else if (c.max_user_id) {
      notifyOpts.replyUrl = buildClientWebUrl(req.masterId, 'max', c.max_user_id, 'chat');
      notifyOpts.replyText = 'Ответить мастеру';
    }
    await sendMessengerNotification(c, notifyText, notifyOpts);

    res.status(201).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при отправке' });
  }
});

// --- Приглашения на повторный визит ---
router.get('/me/repeat-invites', authMiddleware, async (req, res) => {
  try {
    const row = await db.query(
      `SELECT repeat_invite_enabled, repeat_invite_days, repeat_invite_message,
              name, salon_name FROM masters WHERE id = $1`,
      [req.masterId]
    );
    if (row.rows.length === 0) return res.status(404).json({ error: 'Не найден' });
    res.json({
      ...getSalonInviteSettings(row.rows[0]),
      booking_link: buildBookingLink(req.masterId),
      default_message: DEFAULT_MESSAGE
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке настроек' });
  }
});

router.put('/me/repeat-invites', authMiddleware, async (req, res) => {
  try {
    const { enabled, days_after, message } = req.body;
    await db.query(
      `UPDATE masters SET
        repeat_invite_enabled = $1,
        repeat_invite_days = COALESCE($2, repeat_invite_days),
        repeat_invite_message = $3
       WHERE id = $4`,
      [!!enabled, days_after || 30, message || null, req.masterId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при сохранении' });
  }
});

router.post('/me/clients/:clientId/repeat-invite', authMiddleware, async (req, res) => {
  try {
    const { clientId } = req.params;
    const salon = await db.query(
      `SELECT id, name, salon_name, repeat_invite_message FROM masters WHERE id = $1`,
      [req.masterId]
    );
    const client = await db.query(
      `SELECT c.* FROM clients c
       JOIN appointments a ON a.client_id = c.id AND a.master_id = $1
       WHERE c.id = $2 LIMIT 1`,
      [req.masterId, clientId]
    );
    if (client.rows.length === 0) return res.status(404).json({ error: 'Клиент не найден' });

    const c = client.rows[0];
    const salonRow = salon.rows[0];
    const msg = renderInviteMessage(salonRow.repeat_invite_message, {
      clientName: c.name,
      salonName: salonRow.salon_name || salonRow.name,
      bookingLink: buildBookingLink(req.masterId)
    });

    const sent = await sendMessengerNotification(c, msg);
    if (!sent) return res.status(400).json({ error: 'У клиента нет мессенджера' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при отправке приглашения' });
  }
});

// Аналитика салона
router.get('/me/analytics', authMiddleware, async (req, res) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 30));
    const since = daysAgo(days);

    const appointments = await db.query(
      `SELECT a.appointment_time, a.service_name, a.service_price, a.status, a.client_id,
              sm.name AS salon_master_name, sm.id AS salon_master_id
       FROM appointments a
       LEFT JOIN salon_masters sm ON a.salon_master_id = sm.id
       WHERE a.master_id = $1 AND a.appointment_time >= $2`,
      [req.masterId, since]
    );

    const rows = appointments.rows;
    const active = rows.filter((r) => r.status !== 'cancelled');
    const revenue = active.reduce((s, r) => s + Number(r.service_price || 0), 0);

    const clientIds = new Set(active.map((r) => r.client_id).filter(Boolean));
    const newClients = await db.query(
      `SELECT COUNT(DISTINCT c.id)::int AS cnt
       FROM clients c
       JOIN appointments a ON a.client_id = c.id AND a.master_id = $1
       WHERE c.created_at >= $2`,
      [req.masterId, since]
    );

    const serviceMap = {};
    active.forEach((r) => {
      serviceMap[r.service_name] = serviceMap[r.service_name] || { count: 0, revenue: 0 };
      serviceMap[r.service_name].count += 1;
      serviceMap[r.service_name].revenue += Number(r.service_price || 0);
    });
    const topServices = Object.entries(serviceMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const masterMap = {};
    active.forEach((r) => {
      const key = r.salon_master_name || 'Без мастера';
      masterMap[key] = masterMap[key] || { appointments: 0, revenue: 0 };
      masterMap[key].appointments += 1;
      masterMap[key].revenue += Number(r.service_price || 0);
    });
    const byMaster = Object.entries(masterMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    const cancelled = rows.filter((r) => r.status === 'cancelled').length;

    res.json({
      period_days: days,
      summary: {
        appointments: active.length,
        cancelled,
        revenue,
        unique_clients: clientIds.size,
        new_clients: newClients.rows[0]?.cnt || 0,
        cancellation_rate: rows.length ? Math.round((cancelled / rows.length) * 100) : 0
      },
      daily: buildDailySeries(rows, days),
      top_services: topServices,
      by_master: byMaster
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении аналитики' });
  }
});

// Ссылки для MAX и Telegram (единая база записей)
router.get('/me/link', authMiddleware, async (req, res) => {
  try {
    const master = await db.query('SELECT id FROM masters WHERE id = $1', [req.masterId]);
    if (master.rows.length === 0) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const { links, encodedMasterId, clientUrl } = buildMasterLinks(req.masterId);
    res.json({
      link: clientUrl,
      links,
      encodedMasterId,
      hint: {
        client: 'Одна ссылка для Instagram, соцсетей и визитки',
        telegram: 'Клиенты входят через Telegram прямо на странице записи',
        max: 'Клиенты MAX подтверждают вход в боте и возвращаются на сайт'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при генерации ссылки' });
  }
});

router.get('/me/billing', authMiddleware, async (req, res) => {
  try {
    const row = await getMasterBillingRow(req.masterId);
    if (!row) return res.status(404).json({ error: 'Мастер не найден' });

    const transactions = await listBillingTransactions(req.masterId);
    res.json({
      locked: !isBillingEnabled(),
      ...getBillingConfig(),
      yookassaConfigured: isYookassaConfigured(),
      ...formatBillingState(row),
      transactions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка загрузки биллинга' });
  }
});

router.post('/me/billing/topup', authMiddleware, async (req, res) => {
  try {
    if (!isBillingEnabled()) {
      return res.status(403).json({ error: 'Оплата пока недоступна — сервис бесплатный' });
    }
    if (!isYookassaConfigured()) {
      return res.status(503).json({ error: 'Платёжная система не настроена' });
    }

    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount < MIN_TOPUP) {
      return res.status(400).json({ error: `Минимальная сумма пополнения — ${MIN_TOPUP} ₽` });
    }

    const payment = await createPayment({
      amount,
      description: `Пополнение баланса Wonder.ru (${amount} ₽)`,
      metadata: { master_id: req.masterId, purpose: 'topup' }
    });

    await db.query(
      `INSERT INTO billing_payments (id, master_id, yookassa_payment_id, amount, purpose, status)
       VALUES ($1, $2, $3, $4, 'topup', 'pending')`,
      [uuidv4(), req.masterId, payment.id, amount]
    );

    res.json({
      paymentId: payment.id,
      confirmationUrl: payment.confirmation?.confirmation_url
    });
  } catch (error) {
    console.error('Topup error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Не удалось создать платёж' });
  }
});

router.post('/me/billing/unlimited', authMiddleware, async (req, res) => {
  try {
    if (!isBillingEnabled()) {
      return res.status(403).json({ error: 'Оплата пока недоступна — сервис бесплатный' });
    }
    if (!isYookassaConfigured()) {
      return res.status(503).json({ error: 'Платёжная система не настроена' });
    }

    const payment = await createPayment({
      amount: UNLIMITED_PRICE,
      description: `Тариф «Безлимит» Wonder.ru (${UNLIMITED_PRICE} ₽ / 30 дней)`,
      metadata: { master_id: req.masterId, purpose: 'unlimited' }
    });

    await db.query(
      `INSERT INTO billing_payments (id, master_id, yookassa_payment_id, amount, purpose, status)
       VALUES ($1, $2, $3, $4, 'unlimited', 'pending')`,
      [uuidv4(), req.masterId, payment.id, UNLIMITED_PRICE]
    );

    res.json({
      paymentId: payment.id,
      confirmationUrl: payment.confirmation?.confirmation_url
    });
  } catch (error) {
    console.error('Unlimited purchase error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Не удалось создать платёж' });
  }
});

router.put('/me/billing/auto-renew', authMiddleware, async (req, res) => {
  try {
    if (!isBillingEnabled()) {
      return res.status(403).json({ error: 'Оплата пока недоступна' });
    }
    await setAutoRenew(req.masterId, req.body.enabled !== false);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

// Черный список
router.get('/me/blacklist', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, c.name as client_name, c.phone as client_phone, c.messenger, c.max_user_id, c.telegram_user_id
       FROM blacklist b
       LEFT JOIN clients c ON b.client_id = c.id
       WHERE b.master_id = $1
       ORDER BY b.created_at DESC`,
      [req.masterId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении чёрного списка' });
  }
});

router.post('/me/blacklist', authMiddleware, async (req, res) => {
  try {
    const { client_id, phone, name, reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Укажите причину добавления в чёрный список' });
    }
    const result = await db.query(
      `INSERT INTO blacklist (master_id, client_id, phone, name, reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (master_id, client_id) DO UPDATE SET reason = $5, phone = COALESCE($3, blacklist.phone), name = COALESCE($4, blacklist.name)
       RETURNING *`,
      [req.masterId, client_id || null, phone || null, name || null, reason.trim()]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при добавлении в чёрный список' });
  }
});

router.delete('/me/blacklist/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM blacklist WHERE id = $1 AND master_id = $2', [req.params.id, req.masterId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при удалении из чёрного списка' });
  }
});

// Проверка, в чёрном ли списке
router.get('/me/blacklist/check', authMiddleware, async (req, res) => {
  try {
    const { client_id, phone } = req.query;
    if (!client_id && !phone) return res.json({ blocked: false });
    let result;
    if (client_id) {
      result = await db.query('SELECT 1 FROM blacklist WHERE master_id = $1 AND client_id = $2 LIMIT 1', [req.masterId, client_id]);
    } else {
      result = await db.query('SELECT 1 FROM blacklist WHERE master_id = $1 AND phone = $2 LIMIT 1', [req.masterId, phone]);
    }
    res.json({ blocked: result.rows.length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка проверки' });
  }
});

// Черный список
router.get('/me/blacklist', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, c.name as client_name, c.phone as client_phone, c.messenger, c.max_user_id, c.telegram_user_id
       FROM blacklist b
       LEFT JOIN clients c ON b.client_id = c.id
       WHERE b.master_id = $1
       ORDER BY b.created_at DESC`,
      [req.masterId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении чёрного списка' });
  }
});

router.post('/me/blacklist', authMiddleware, async (req, res) => {
  try {
    const { client_id, phone, name, reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Укажите причину добавления в чёрный список' });
    }
    const result = await db.query(
      `INSERT INTO blacklist (master_id, client_id, phone, name, reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (master_id, client_id) DO UPDATE SET reason = $5, phone = COALESCE($3, blacklist.phone), name = COALESCE($4, blacklist.name)
       RETURNING *`,
      [req.masterId, client_id || null, phone || null, name || null, reason.trim()]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при добавлении в чёрный список' });
  }
});

router.delete('/me/blacklist/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM blacklist WHERE id = $1 AND master_id = $2', [req.params.id, req.masterId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при удалении из чёрного списка' });
  }
});

// Проверка, в чёрном ли списке
router.get('/me/blacklist/check', authMiddleware, async (req, res) => {
  try {
    const { client_id, phone } = req.query;
    if (!client_id && !phone) return res.json({ blocked: false });
    let result;
    if (client_id) {
      result = await db.query('SELECT 1 FROM blacklist WHERE master_id = $1 AND client_id = $2 LIMIT 1', [req.masterId, client_id]);
    } else {
      result = await db.query('SELECT 1 FROM blacklist WHERE master_id = $1 AND phone = $2 LIMIT 1', [req.masterId, phone]);
    }
    res.json({ blocked: result.rows.length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка проверки' });
  }
});

module.exports = router;
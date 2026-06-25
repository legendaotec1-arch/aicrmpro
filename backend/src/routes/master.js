const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { uploadsDir } = require('../config/paths');
const { optimizeMulterImage, createThumbnail } = require('../utils/imageOptimize');
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
const { validateServiceName } = require('../utils/serviceName');
const { resolveTeamMasterId } = require('../utils/teamContext');
const { getAvailableSlots } = require('../utils/bookingSlots');
const { masterAuthMiddleware: authMiddleware, requireOwner } = require('../utils/masterAuth');
const {
  getOverviewStats,
  fetchTeamRevenueRows,
  buildTeamRevenueCsv,
  buildOwnerRevenueXlsx
} = require('../utils/revenueReport');
const { buildStats } = require('../utils/clientStats');
const { fetchClientsExportRows, buildClientsCsv } = require('../utils/clientsExport');
const { formatClientDisplayName } = require('../utils/clientDisplay');
const { formatMasterPublicTitle } = require('../utils/masterDisplay');
const { assignUniqueSlug, resolveMasterIdFromParam, buildMasterMeta } = require('../seo/masterSeo');
const { extractCityFromAddress } = require('../utils/slugify');
const { buildSocialLinksFromRow, pickSocialPayload, normalizeSocialInput } = require('../utils/socialLinks');
const { isRuPhoneComplete, normalizeRuPhoneForStorage } = require('../utils/phoneRu');
const { upsertScheduleException, cleanupPastScheduleExceptions, salonTodayDateStr } = require('../utils/scheduleExceptions');
const { listRussianTimezones, getTimezoneLabel, normalizeTimezone } = require('../utils/salonTime');
const { getSalonTimezone } = require('../utils/salonTimezone');
const { sendMessengerNotification } = require('../utils/notify');
const { fetchBroadcastRecipients } = require('../utils/broadcast');
const { getPublicUrl } = require('../utils/links');
const { buildSalonAnalytics, buildAnalyticsExportXlsx } = require('../utils/salonAnalytics');
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
  resolveBookingLink,
  DEFAULT_MESSAGE
} = require('../utils/repeatInvite');
const { sanitizeMasterMediaRow, sanitizePortfolioRow } = require('../utils/mediaResolve');
const { internalAuthHeaders } = require('../utils/internalAuth');
const { queryWithColumnFallback } = require('../utils/safeQuery');
const { buildClientContactInfo, buildClientPhoneFields, buildClientChannelFields } = require('../utils/clientContact');
const {
  getMasterBillingRow,
  formatBillingState,
  isBillingEnabled,
  listBillingTransactions,
  setAutoRenew,
  MIN_TOPUP,
  UNLIMITED_PRICE,
  getBillingConfig,
  buildBillingReturnUrl,
  resolveBillingPaymentReturn
} = require('../utils/billing');
const { buildMessengerBookingUrl } = require('../utils/bookingPublicUrl');
const { createPayment, isYookassaConfigured } = require('../utils/yookassa');

const router = express.Router();

async function getMasterPublicSlug(masterId) {
  return ensurePublicSlug(masterId);
}

async function buildClientWebUrl(masterId, channel, userId, tab = 'booking', publicSlug = null) {
  return buildMessengerBookingUrl(masterId, channel, userId, tab, publicSlug);
}

function toAbsoluteUploadUrl(pathOrUrl) {
  if (!pathOrUrl) return null;
  const raw = String(pathOrUrl).trim();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const base = getPublicUrl();
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function parseBroadcastBody(body = {}) {
  return {
    message: String(body.message || '').trim(),
    image_url: body.image_url ? String(body.image_url).trim() : null,
    channel: body.channel || 'all',
    audience: body.audience || 'all',
    inactive_days: Number(body.inactive_days) || 30,
    client_ids: Array.isArray(body.client_ids) ? body.client_ids : [],
  };
}

// Middleware для проверки авторизации (владелец или мастер команды)

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

const upload = multer({ storage, limits: { fileSize: 60 * 1024 * 1024 } }); // legacy fallback

const imageMimeFilter = (_req, file, cb) => {
  if (/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype || '')) cb(null, true);
  else cb(new Error('Допустимы только изображения'));
};

const mediaMimeFilter = (_req, file, cb) => {
  if (/^image\//i.test(file.mimetype || '') || /^video\//i.test(file.mimetype || '')) cb(null, true);
  else cb(new Error('Допустимы только изображения и видео'));
};

const uploadImage = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: imageMimeFilter
});

const uploadMedia = multer({
  storage,
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: mediaMimeFilter
});

const uploadVideoReel = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('video/')) cb(null, true);
    else cb(new Error('Допустимы только видеофайлы'));
  }
});

// --- Мастера салона (исполнители) ---
router.get('/me/salon-masters', authMiddleware, requireOwner, async (req, res) => {
  try {
    const rows = await listSalonMasters(req.masterId);
    res.json(
      rows.map(({ password_hash, ...row }) => ({
        ...row,
        has_login: Boolean(row.email && password_hash)
      }))
    );
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении мастеров' });
  }
});

router.post('/me/salon-masters', authMiddleware, requireOwner, async (req, res) => {
  try {
    const {
      name,
      last_name,
      specialty,
      description,
      slot_step_minutes,
      sort_order,
      is_active,
      photo_url,
      email,
      password,
      commission_percent
    } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Укажите имя мастера' });
    }
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Укажите email для входа мастера' });
    }

    const emailNorm = email.trim().toLowerCase();
    const dupOwner = await db.query('SELECT id FROM masters WHERE LOWER(email) = $1', [emailNorm]);
    if (dupOwner.rows.length > 0) {
      return res.status(400).json({ error: 'Этот email уже занят' });
    }
    const dupTeam = await db.query(
      `SELECT id FROM salon_masters WHERE LOWER(email) = $1`,
      [emailNorm]
    );
    if (dupTeam.rows.length > 0) {
      return res.status(400).json({ error: 'Этот email уже используется другим мастером' });
    }

    const password_hash = password && String(password).length >= 6
      ? await bcrypt.hash(String(password), 10)
      : await randomPasswordHash();
    const pct = Math.min(100, Math.max(0, Number(commission_percent) || 0));
    const id = uuidv4();
    await db.query(
      `INSERT INTO salon_masters (
         id, salon_id, name, last_name, specialty, description, photo_url, slot_step_minutes, sort_order, is_active,
         email, password_hash, commission_percent
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        req.masterId,
        name.trim(),
        last_name?.trim() || null,
        specialty || null,
        description || null,
        photo_url || null,
        slot_step_minutes || 60,
        sort_order ?? 0,
        is_active !== false,
        emailNorm,
        password_hash,
        pct
      ]
    );
    res.status(201).json({ id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при создании мастера' });
  }
});

router.put('/me/salon-masters/:id', authMiddleware, requireOwner, async (req, res) => {
  try {
    const row = await getSalonMasterById(req.params.id, req.masterId);
    if (!row) return res.status(404).json({ error: 'Мастер не найден' });

    const {
      name,
      last_name,
      specialty,
      description,
      slot_step_minutes,
      sort_order,
      is_active,
      photo_url,
      email,
      password,
      commission_percent
    } = req.body;

    let password_hash = row.password_hash;
    if (password && String(password).length >= 6) {
      password_hash = await bcrypt.hash(String(password), 10);
    }

    let emailNorm = row.email;
    if (email !== undefined) {
      emailNorm = email?.trim()?.toLowerCase() || null;
      if (emailNorm) {
        const dupOwner = await db.query('SELECT id FROM masters WHERE LOWER(email) = $1', [emailNorm]);
        if (dupOwner.rows.length > 0) {
          return res.status(400).json({ error: 'Этот email уже занят' });
        }
        const dupTeam = await db.query(
          `SELECT id FROM salon_masters WHERE LOWER(email) = $1 AND id != $2`,
          [emailNorm, req.params.id]
        );
        if (dupTeam.rows.length > 0) {
          return res.status(400).json({ error: 'Этот email уже используется другим мастером' });
        }
      }
    }

    const pct =
      commission_percent !== undefined
        ? Math.min(100, Math.max(0, Number(commission_percent) || 0))
        : row.commission_percent;

    await db.query(
      `UPDATE salon_masters SET
        name = COALESCE($1, name),
        last_name = COALESCE($2, last_name),
        specialty = COALESCE($3, specialty),
        description = COALESCE($4, description),
        photo_url = COALESCE($5, photo_url),
        slot_step_minutes = COALESCE($6, slot_step_minutes),
        sort_order = COALESCE($7, sort_order),
        is_active = COALESCE($8, is_active),
        email = COALESCE($9, email),
        password_hash = COALESCE($10, password_hash),
        commission_percent = COALESCE($11, commission_percent)
       WHERE id = $12 AND salon_id = $13`,
      [
        name,
        last_name,
        specialty,
        description,
        photo_url,
        slot_step_minutes,
        sort_order,
        is_active,
        emailNorm,
        password_hash,
        pct,
        req.params.id,
        req.masterId
      ]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении мастера' });
  }
});

router.post('/me/salon-masters/:id/photo', authMiddleware, uploadImage.single('photo'), async (req, res) => {
  try {
    const row = await getSalonMasterById(req.params.id, req.masterId);
    if (!row) return res.status(404).json({ error: 'Мастер не найден' });
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });

    const photo_url = await optimizeMulterImage(req.file, { maxWidth: 800, quality: 84 })
      || `/uploads/${req.file.filename}`;
    await db.query('UPDATE salon_masters SET photo_url = $1 WHERE id = $2', [photo_url, req.params.id]);
    res.json({ photo_url });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки фото' });
  }
});

router.delete('/me/salon-masters/:id', authMiddleware, requireOwner, async (req, res) => {
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

router.delete('/me/salon-masters/:id/permanent', authMiddleware, requireOwner, async (req, res) => {
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
    const masterId = await resolveMasterIdFromParam(req.params.masterId);
    if (!isResolvedMasterId(masterId)) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const master = await queryWithColumnFallback(
      db,
      `SELECT id, name, last_name, salon_name, logo_url, description, phone, address,
              latitude, longitude, yandex_maps_link, client_theme, timezone,
              social_telegram, social_instagram, social_vk, social_website, social_max,
              video_reel_url, public_slug, city, public_indexable
       FROM masters WHERE id = $1`,
      `SELECT id, name, last_name, salon_name, logo_url, description, phone, address,
              latitude, longitude, yandex_maps_link, client_theme, timezone,
              social_telegram, social_instagram, social_vk, social_website, social_max,
              video_reel_url
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

    const masterRow = sanitizeMasterMediaRow(master.rows[0]);
    const publicSlug = masterRow.public_slug || await assignUniqueSlug(db, masterRow);
    const salonTimezone = normalizeTimezone(masterRow.timezone);
    const socialLinks = buildSocialLinksFromRow(masterRow);
    let billingState = null;
    if (isBillingEnabled()) {
      try {
        const billingRow = await getMasterBillingRow(masterId);
        if (billingRow) billingState = formatBillingState(billingRow);
      } catch (billingErr) {
        console.error('Billing lookup failed for public master page:', billingErr.message);
        billingState = {
          online_booking_allowed: false,
          online_booking_block_reason: 'Биллинг временно недоступен'
        };
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
    const reviewSummary = {
      count: reviewStats.rows[0]?.count || 0,
      average: Number(reviewStats.rows[0]?.average) || null
    };
    const seoMeta = buildMasterMeta(masterRow, { services: priceList, reviewSummary });
    const { clientUrl } = buildMasterLinks(masterId, { publicSlug });

    res.json({
      master: {
        ...masterPublic,
        timezone: salonTimezone,
        timezoneLabel: getTimezoneLabel(salonTimezone),
        socialLinks,
        client_theme: normalizeClientTheme(masterRow.client_theme),
        display_title: formatMasterPublicTitle(masterRow),
        public_slug: publicSlug,
        city: masterRow.city || extractCityFromAddress(masterRow.address),
        canonical_url: clientUrl,
      },
      seo: {
        title: seoMeta.title,
        description: seoMeta.description,
        canonical: clientUrl,
        indexable: masterRow.public_indexable !== false,
      },
      teamMasters,
      priceGroups,
      portfolio: portfolio.rows.map(sanitizePortfolioRow),
      priceList,
      reviewSummary,
      reviews: recentReviews.rows,
      booking: {
        timezone: salonTimezone,
        timezoneLabel: getTimezoneLabel(salonTimezone),
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
router.get('/me/profile', authMiddleware, requireOwner, async (req, res) => {
  try {
    const result = await queryWithColumnFallback(
      db,
      `SELECT id, email, name, last_name, salon_name, logo_url, description, phone,
              address, latitude, longitude, yandex_maps_link, client_theme, timezone, created_at,
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

    const row = sanitizeMasterMediaRow(result.rows[0]);
    const salonTimezone = normalizeTimezone(row.timezone);
    res.json({
      ...row,
      timezone: salonTimezone,
      timezoneLabel: getTimezoneLabel(salonTimezone),
      client_theme: normalizeClientTheme(row.client_theme)
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении профиля' });
  }
});

router.get('/me/client-themes', authMiddleware, requireOwner, (_req, res) => {
  res.json({ themes: listClientThemesCatalog(), defaultTheme: DEFAULT_CLIENT_THEME });
});

router.get('/me/timezones', authMiddleware, requireOwner, (_req, res) => {
  res.json({ timezones: listRussianTimezones(), defaultTimezone: normalizeTimezone() });
});

router.put('/me/client-theme', authMiddleware, requireOwner, async (req, res) => {
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
router.put('/me/profile', authMiddleware, requireOwner, async (req, res) => {
  try {
    let { name, last_name, salon_name, description, phone, address, latitude, longitude, yandex_maps_link, timezone } = req.body;
    const normalizedTimezone = timezone != null ? normalizeTimezone(timezone) : null;

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
          timezone = COALESCE($16, timezone),
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
          social.social_max ?? null,
          normalizedTimezone
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
          timezone = COALESCE($11, timezone),
          updated_at = NOW()
         WHERE id = $10`,
        [name, last_name, salon_name, description, phone, address, latitude, longitude, yandex_maps_link, req.masterId, normalizedTimezone]
      );
    }

    const updated = await db.query(
      `SELECT address, latitude, longitude, yandex_maps_link, timezone, name, last_name, salon_name, public_slug
       FROM masters WHERE id = $1`,
      [req.masterId]
    );
    const row = updated.rows[0];
    if (row) {
      await assignUniqueSlug(db, {
        ...row,
        id: req.masterId,
        address: row.address,
      });
    }

    res.json({ success: true, ...row, timezoneLabel: getTimezoneLabel(row?.timezone) });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении профиля' });
  }
});

// Загрузить логотип
router.post('/me/logo', authMiddleware, uploadImage.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const logo_url = await optimizeMulterImage(req.file, { maxWidth: 800, quality: 84 })
      || `/uploads/${req.file.filename}`;
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
    const salonMasterId = await resolveTeamMasterId(req.masterId, req.query.salonMasterId, req.salonMasterId);
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
    const salonMasterId = await resolveTeamMasterId(req.masterId, bodySalonMasterId, req.salonMasterId);

    if (!salonMasterId) {
      return res.status(400).json({ error: 'Мастер салона не найден. Обратитесь в поддержку.' });
    }

    if (!Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({ error: 'Укажите расписание' });
    }

    await db.query('BEGIN');
    try {
      await db.query('DELETE FROM work_schedule WHERE salon_master_id = $1', [salonMasterId]);

      for (const day of schedule) {
        await db.query(
          `INSERT INTO work_schedule (id, master_id, salon_master_id, day_of_week, start_time, end_time, is_day_off)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            uuidv4(),
            req.masterId,
            salonMasterId,
            day.day_of_week,
            day.start_time,
            day.end_time,
            day.is_day_off || false
          ]
        );
      }

      await db.query('COMMIT');
    } catch (txError) {
      await db.query('ROLLBACK');
      throw txError;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving schedule:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при сохранении расписания' });
  }
});

// Свободные слоты для ручной записи (та же логика, что у клиента)
router.get('/me/slots', authMiddleware, async (req, res) => {
  try {
    const { date, salonMasterId: querySalonMasterId, durationMinutes, excludeAppointmentId } = req.query;
    const salonMasterId = await resolveTeamMasterId(
      req.masterId,
      querySalonMasterId,
      req.salonMasterId
    );

    const slots = await getAvailableSlots(db, {
      salonId: req.masterId,
      salonMasterId,
      date,
      durationMinutes,
      excludeAppointmentId: excludeAppointmentId || null
    });

    res.json(slots);
  } catch (error) {
    console.error('Error fetching master slots:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при получении слотов' });
  }
});

// Получить исключения в расписании
router.get('/me/exceptions', authMiddleware, async (req, res) => {
  try {
    const salonMasterId = await resolveTeamMasterId(req.masterId, req.query.salonMasterId, req.salonMasterId);
    const salonTimezone = await getSalonTimezone(db, req.masterId);
    await cleanupPastScheduleExceptions(db, { salonMasterId, timeZone: salonTimezone });
    const today = salonTodayDateStr(salonTimezone);
    const result = await db.query(
      'SELECT * FROM schedule_exceptions WHERE salon_master_id = $1 AND exception_date >= $2::date ORDER BY exception_date',
      [salonMasterId, today]
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
    const salonMasterId = await resolveTeamMasterId(req.masterId, bodySalonMasterId, req.salonMasterId);
    const salonTimezone = await getSalonTimezone(db, req.masterId);
    await cleanupPastScheduleExceptions(db, { salonMasterId, timeZone: salonTimezone });

    await upsertScheduleException(db, {
      masterId: req.masterId,
      salonMasterId,
      exception_date,
      is_working,
      start_time,
      end_time,
      timeZone: salonTimezone
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

    const salonMasterId = await resolveTeamMasterId(req.masterId, bodySalonMasterId, req.salonMasterId);
    const salonTimezone = await getSalonTimezone(db, req.masterId);
    await cleanupPastScheduleExceptions(db, { salonMasterId, timeZone: salonTimezone });
    const normalized = [...new Set(dates.map((d) => String(d).slice(0, 10)))].filter((d) =>
      /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= salonTodayDateStr(salonTimezone)
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
        end_time: null,
        timeZone: salonTimezone
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
    const salonMasterId = await resolveTeamMasterId(req.masterId, req.query.salonMasterId, req.salonMasterId);
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
    const salonMasterId = await resolveTeamMasterId(req.masterId, req.query.salonMasterId, req.salonMasterId);
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
    const salonMasterId = await resolveTeamMasterId(req.masterId, bodySalonMasterId, req.salonMasterId);

    const nameCheck = validateServiceName(name);
    if (!nameCheck.ok) {
      return res.status(400).json({ error: nameCheck.error });
    }
    const serviceName = nameCheck.value;

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
        [serviceName, priceNum, storedMax, type, duration_minutes, image_url, sort_order || 0, is_active !== false, id, salonMasterId]
      );
    } else {
      await db.query(
        `INSERT INTO price_items (id, master_id, salon_master_id, name, price, price_max, price_type, duration_minutes, image_url, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [uuidv4(), req.masterId, salonMasterId, serviceName, priceNum, storedMax, type, duration_minutes, image_url, sort_order || 0, is_active !== false]
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
    const salonMasterId = await resolveTeamMasterId(req.masterId, req.query.salonMasterId, req.salonMasterId);
    await db.query('DELETE FROM price_items WHERE id = $1 AND salon_master_id = $2', [req.params.id, salonMasterId]);
    res.json({ success: true });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при удалении позиции' });
  }
});

// Загрузить фото для прайс-листа
router.post('/me/prices/upload', authMiddleware, uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    const image_url = await optimizeMulterImage(req.file, { maxWidth: 900, quality: 82 })
      || `/uploads/${req.file.filename}`;
    res.json({ image_url });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке фото' });
  }
});

// Получить портфолио (общее для салона)
router.get('/me/portfolio', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM portfolio WHERE master_id = $1 ORDER BY sort_order, created_at',
      [req.masterId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении портфолио' });
  }
});

// Добавить медиа на главную страницу клиента (общее портфолио салона)
router.post('/me/portfolio', authMiddleware, uploadMedia.single('media'), async (req, res) => {
  try {
    const { title, sort_order, media_type, video_url } = req.body;
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

    let file_url = req.file ? `/uploads/${req.file.filename}` : null;
    let image_url = requestedType === 'image' ? file_url : null;
    let thumbnail_url = null;
    if (requestedType === 'image' && req.file) {
      image_url = await optimizeMulterImage(req.file, { maxWidth: 1400, quality: 82 }) || file_url;
      thumbnail_url = await createThumbnail(image_url, { width: 480, quality: 74 });
    }
    const finalVideoUrl = requestedType === 'video' ? file_url : video_url?.trim() || null;

    await db.query(
      `INSERT INTO portfolio (id, master_id, salon_master_id, image_url, thumbnail_url, media_type, video_url, title, sort_order)
       VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), req.masterId, image_url, thumbnail_url, requestedType, finalVideoUrl, title, sort_order || 0]
    );

    res.json({ success: true, image_url, thumbnail_url, video_url: finalVideoUrl, media_type: requestedType });
  } catch (error) {
    console.error(error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при добавлении медиа' });
  }
});

// Удалить фото из портфолио
router.delete('/me/portfolio/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM portfolio WHERE id = $1 AND master_id = $2', [req.params.id, req.masterId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при удалении фото' });
  }
});

// Выгрузка клиентской базы в CSV
router.get('/me/clients/export', authMiddleware, async (req, res) => {
  try {
    const rows = await fetchClientsExportRows({
      masterId: req.masterId,
      salonMasterId: req.salonMasterId,
      isTeamMember: req.isTeamMember
    });
    const masterRow = await db.query(
      'SELECT salon_name, name, last_name FROM masters WHERE id = $1',
      [req.masterId]
    );
    const m = masterRow.rows[0];
    const salonTitle = m?.salon_name || [m?.name, m?.last_name].filter(Boolean).join(' ') || 'Клиентская база';
    const csv = buildClientsCsv(rows, { salonTitle });
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="clients_${stamp}.csv"; filename*=UTF-8''${encodeURIComponent(`клиенты_${stamp}.csv`)}`
    );
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при выгрузке клиентов' });
  }
});

// Получить всех клиентов салона (с краткой статистикой)
router.get('/me/clients', authMiddleware, async (req, res) => {
  try {
    const teamFilter = req.isTeamMember && req.salonMasterId
      ? `AND EXISTS (
           SELECT 1 FROM appointments ax
           WHERE ax.client_id = c.id AND ax.master_id = $1 AND ax.salon_master_id = $2
         )`
      : '';
    const params = req.isTeamMember && req.salonMasterId ? [req.masterId, req.salonMasterId] : [req.masterId];
    const apptTeamJoin = req.isTeamMember && req.salonMasterId
      ? ' AND a.salon_master_id = $2'
      : '';

    const result = await db.query(
      `SELECT c.id, c.name, c.photo_url, c.phone AS client_phone, c.messenger, c.max_user_id, c.telegram_user_id, c.created_at,
              scp.first_name, scp.last_name, scp.patronymic, scp.phone AS profile_phone, scp.notes,
              COUNT(a.id) FILTER (WHERE a.status != 'cancelled')::int AS visit_count,
              COUNT(a.id) FILTER (WHERE a.status = 'completed')::int AS completed_count,
              MAX(a.appointment_time) FILTER (WHERE a.status != 'cancelled') AS last_visit,
              COALESCE(SUM(a.service_price) FILTER (WHERE a.status IN ('confirmed', 'completed')), 0)::numeric AS total_spent
       FROM clients c
       LEFT JOIN salon_client_profiles scp ON scp.client_id = c.id AND scp.salon_id = $1
       LEFT JOIN appointments a ON a.client_id = c.id AND a.master_id = $1${apptTeamJoin}
       WHERE (scp.salon_id = $1 OR a.id IS NOT NULL)
         AND COALESCE(scp.deleted_at, 'epoch'::timestamp) = 'epoch'::timestamp
         ${teamFilter}
       GROUP BY c.id, c.name, c.photo_url, c.phone, c.messenger, c.max_user_id, c.telegram_user_id, c.created_at,
                scp.first_name, scp.last_name, scp.patronymic, scp.phone, scp.notes
       ORDER BY last_visit DESC NULLS LAST, c.created_at DESC, c.name`,
      params
    );
    const rows = result.rows.map((row) => ({
      ...row,
      display_name: formatClientDisplayName({
        first_name: row.first_name,
        last_name: row.last_name,
        patronymic: row.patronymic,
        name: row.name
      }),
      ...buildClientPhoneFields(row),
      ...buildClientChannelFields(row)
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
              scp.phone AS profile_phone, scp.notes AS salon_notes,
              scp.note_1, scp.note_2, scp.note_3
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
    const contact = await buildClientContactInfo(row, { withTelegramUrl: true });
    const stats = buildStats(history.rows);
    const now = new Date();
    const activeAppointments = history.rows.filter(
      (a) => a.status === 'confirmed' && new Date(a.appointment_time) >= now
    );

    res.json({
      client: {
        ...row,
        display_name: displayName,
        phone: contact.phone,
        salon_notes: row.salon_notes,
        note_1: row.note_1 || row.salon_notes || null,
        note_2: row.note_2 || null,
        note_3: row.note_3 || null,
        ...contact
      },
      stats,
      appointments: history.rows.slice(0, 3),
      active_appointments: activeAppointments
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
    const { notes, note_1, note_2, note_3, first_name, last_name, patronymic, phone } = req.body;

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

    const n1 = note_1 !== undefined ? (note_1?.trim() || null) : (notes?.trim() || null);
    const n2 = note_2 !== undefined ? (note_2?.trim() || null) : null;
    const n3 = note_3 !== undefined ? (note_3?.trim() || null) : null;

    await db.query(
      `INSERT INTO salon_client_profiles (salon_id, client_id, first_name, last_name, patronymic, phone, notes, note_1, note_2, note_3, deleted_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NOW())
       ON CONFLICT (salon_id, client_id)
       DO UPDATE SET
         first_name = COALESCE($3, salon_client_profiles.first_name),
         last_name = COALESCE($4, salon_client_profiles.last_name),
         patronymic = COALESCE($5, salon_client_profiles.patronymic),
         phone = COALESCE($6, salon_client_profiles.phone),
         notes = COALESCE($7, salon_client_profiles.notes),
         note_1 = COALESCE($8, salon_client_profiles.note_1),
         note_2 = COALESCE($9, salon_client_profiles.note_2),
         note_3 = COALESCE($10, salon_client_profiles.note_3),
         deleted_at = NULL,
         updated_at = NOW()`,
      [req.masterId, clientId, fName, lName, patr, phoneVal, n1, n1, n2, n3]
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
    const { message, channel } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Введите текст сообщения' });
    }
    if (channel && !['telegram', 'max', 'all'].includes(channel)) {
      return res.status(400).json({ error: 'Неверный канал сообщения' });
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
    const publicSlug = await getMasterPublicSlug(req.masterId);
    const notifyText = `💬 Сообщение от салона:\n\n${message.trim()}`;
    const notifyOpts = { channel: channel || 'all' };
    if (c.telegram_user_id) {
      notifyOpts.replyUrl = await buildClientWebUrl(req.masterId, 'telegram', c.telegram_user_id, 'chat', publicSlug);
      notifyOpts.replyText = 'Ответить мастеру';
    } else if (c.max_user_id) {
      notifyOpts.replyUrl = await buildClientWebUrl(req.masterId, 'max', c.max_user_id, 'chat', publicSlug);
      notifyOpts.replyText = 'Ответить мастеру';
    }
    const sent = await sendMessengerNotification(c, notifyText, notifyOpts);
    if (!sent) {
      const err =
        channel === 'telegram' ? 'У клиента нет Telegram' :
        channel === 'max' ? 'У клиента нет MAX' :
        'У клиента нет ID мессенджера';
      return res.status(400).json({ error: err });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при отправке сообщения' });
  }
});

// Рассылка клиентам
router.get('/me/broadcast/preview', authMiddleware, requireOwner, async (req, res) => {
  try {
    const opts = parseBroadcastBody({
      channel: req.query.channel,
      audience: req.query.audience,
      inactive_days: req.query.inactive_days,
      client_ids: req.query.client_ids ? String(req.query.client_ids).split(',').filter(Boolean) : [],
    });
    const recipients = await fetchBroadcastRecipients(req.masterId, opts);
    res.json({
      count: recipients.length,
      recipients: recipients.map((r) => ({
        id: r.id,
        name: r.name,
        has_telegram: !!r.telegram_user_id,
        has_max: !!r.max_user_id,
        last_visit: r.last_visit,
      })),
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при подсчёте получателей' });
  }
});

router.post('/me/broadcast/upload', authMiddleware, requireOwner, uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    const image_url = `/uploads/${req.file.filename}`;
    res.json({ image_url, absolute_url: toAbsoluteUploadUrl(image_url) });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке изображения' });
  }
});

router.post('/me/broadcast', authMiddleware, requireOwner, async (req, res) => {
  try {
    const opts = parseBroadcastBody(req.body);
    if (!opts.message && !opts.image_url) {
      return res.status(400).json({ error: 'Введите текст или добавьте изображение' });
    }

    const recipients = await fetchBroadcastRecipients(req.masterId, opts);
    if (recipients.length === 0) {
      return res.status(400).json({ error: 'Нет получателей для рассылки' });
    }

    const imageUrl = toAbsoluteUploadUrl(opts.image_url);
    const publicSlug = await getMasterPublicSlug(req.masterId);
    const notifyText = opts.message
      ? (opts.image_url ? opts.message : `💬 Сообщение от салона:\n\n${opts.message}`)
      : '';

    let sent = 0;
    let failed = 0;

    for (const client of recipients) {
      const notifyOpts = {
        channel: opts.channel,
        ...(imageUrl ? { imageUrl } : {}),
      };
      if (client.telegram_user_id) {
        notifyOpts.replyUrl = await buildClientWebUrl(req.masterId, 'telegram', client.telegram_user_id, 'booking', publicSlug);
        notifyOpts.replyText = 'Записаться';
      } else if (client.max_user_id) {
        notifyOpts.replyUrl = await buildClientWebUrl(req.masterId, 'max', client.max_user_id, 'booking', publicSlug);
        notifyOpts.replyText = 'Записаться';
      }

      const ok = await sendMessengerNotification(client, notifyText, notifyOpts);
      if (ok) sent += 1;
      else failed += 1;
    }

    res.json({ success: true, recipients: sent, failed, total: recipients.length });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Ошибка при отправке рассылки' });
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
      `SELECT phone, social_telegram, notify_email, email
       FROM masters WHERE id = $1`,
      [req.masterId]
    );
    const row = result.rows[0] || {};
    res.json({
      contact_phone: row.phone || '',
      contact_telegram: row.social_telegram || '',
      notify_email: row.notify_email || row.email || '',
      account_email: row.email || '',
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.put('/me/notify-settings', authMiddleware, async (req, res) => {
  try {
    const { contact_telegram, contact_phone, notify_email } = req.body;
    const phoneRaw = String(contact_phone || '').trim();
    const phone = phoneRaw
      ? (isRuPhoneComplete(phoneRaw) ? normalizeRuPhoneForStorage(phoneRaw) : phoneRaw)
      : null;
    const telegram = normalizeSocialInput('telegram', contact_telegram);
    const emailRaw = String(notify_email || '').trim().toLowerCase();
    const notifyEmail = emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;
    if (emailRaw && !notifyEmail) {
      return res.status(400).json({ error: 'Укажите корректный email' });
    }
    await db.query(
      `UPDATE masters SET
        social_telegram = $1,
        phone = $2,
        notify_email = $3,
        updated_at = NOW()
       WHERE id = $4`,
      [telegram, phone, notifyEmail, req.masterId]
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
    const { is_published, salon_reply, body, rating } = req.body;

    if (rating != null) {
      const r = Number(rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        return res.status(400).json({ error: 'Оценка от 1 до 5' });
      }
    }

    const result = await db.query(
      `UPDATE reviews SET
        is_published = COALESCE($1, is_published),
        salon_reply = COALESCE($2, salon_reply),
        body = COALESCE($3, body),
        rating = COALESCE($4, rating)
       WHERE id = $5 AND salon_id = $6 RETURNING id`,
      [
        is_published !== undefined ? is_published : null,
        salon_reply !== undefined ? salon_reply : null,
        body !== undefined ? body : null,
        rating !== undefined ? Number(rating) : null,
        req.params.id,
        req.masterId
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Отзыв не найден' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении отзыва' });
  }
});

router.delete('/me/reviews/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM reviews WHERE id = $1 AND salon_id = $2 RETURNING id',
      [req.params.id, req.masterId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Отзыв не найден' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении отзыва' });
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
    const publicSlug = await getMasterPublicSlug(req.masterId);
    const notifyText = `💬 Сообщение от салона:\n\n${text.trim()}`;
    const notifyOpts = {};
    if (c.telegram_user_id) {
      notifyOpts.replyUrl = await buildClientWebUrl(req.masterId, 'telegram', c.telegram_user_id, 'chat', publicSlug);
      notifyOpts.replyText = 'Ответить мастеру';
    } else if (c.max_user_id) {
      notifyOpts.replyUrl = await buildClientWebUrl(req.masterId, 'max', c.max_user_id, 'chat', publicSlug);
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
    const booking_link = await resolveBookingLink(req.masterId);
    res.json({
      ...getSalonInviteSettings(row.rows[0]),
      booking_link,
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
    const bookingLink = await resolveBookingLink(req.masterId);
    const msg = renderInviteMessage(salonRow.repeat_invite_message, {
      clientName: c.name,
      salonName: salonRow.salon_name || salonRow.name,
      bookingLink,
    });

    const publicSlug = await getMasterPublicSlug(req.masterId);
    const notifyOpts = { channel: 'all', replyText: 'Записаться' };
    if (c.telegram_user_id) {
      notifyOpts.replyUrl = await buildClientWebUrl(req.masterId, 'telegram', c.telegram_user_id, 'booking', publicSlug);
    } else if (c.max_user_id) {
      notifyOpts.replyUrl = await buildClientWebUrl(req.masterId, 'max', c.max_user_id, 'booking', publicSlug);
    }

    const sent = await sendMessengerNotification(c, msg, notifyOpts);
    if (!sent) return res.status(400).json({ error: 'У клиента нет мессенджера' });

    const channels = [];
    if (c.telegram_user_id) channels.push('telegram');
    if (c.max_user_id) channels.push('max');

    res.json({ success: true, channels });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при отправке приглашения' });
  }
});

// Сводка на главной + выгрузка выручки
router.get('/me/overview-stats', authMiddleware, async (req, res) => {
  try {
    let commission = 0;
    if (req.isTeamMember && req.salonMasterId) {
      const row = await getSalonMasterById(req.salonMasterId, req.masterId);
      commission = Number(row?.commission_percent || 0);
    }
    const stats = await getOverviewStats({
      salonId: req.masterId,
      salonMasterId: req.isTeamMember ? req.salonMasterId : null,
      commissionPercent: commission
    });
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении статистики' });
  }
});

router.get('/me/revenue-export', authMiddleware, async (req, res) => {
  try {
    const month = req.query.month === 'all' ? null : req.query.month || null;
    const periodSlug = month || 'vse-vremya';

    if (req.isTeamMember) {
      let commission = 0;
      if (req.salonMasterId) {
        const row = await getSalonMasterById(req.salonMasterId, req.masterId);
        commission = Number(row?.commission_percent || 0);
      }
      const rows = await fetchTeamRevenueRows({
        salonId: req.masterId,
        salonMasterId: req.salonMasterId,
        commissionPercent: commission,
        month
      });
      const csv = buildTeamRevenueCsv(rows);
      const filename = `vyruchka-${periodSlug}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    }

    const xlsx = await buildOwnerRevenueXlsx({ salonId: req.masterId, month });
    const filename = `vyruchka-${periodSlug}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(Buffer.from(xlsx));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при выгрузке' });
  }
});

// Аналитика салона
router.get('/me/analytics', authMiddleware, requireOwner, async (req, res) => {
  try {
    const month = req.query.month || null;
    const data = await buildSalonAnalytics(req.masterId, { month });
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при получении аналитики' });
  }
});

router.get('/me/analytics-export', authMiddleware, requireOwner, async (req, res) => {
  try {
    const month = req.query.month || null;
    const salonMasterId = req.query.master_id || null;
    const xlsx = await buildAnalyticsExportXlsx({
      salonId: req.masterId,
      month,
      salonMasterId
    });
    const periodSlug = month || 'tekushiy-mesyac';
    const slug = salonMasterId ? `master-${String(salonMasterId).slice(0, 8)}` : 'salon';
    const filename = `analitika-${slug}-${periodSlug}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(Buffer.from(xlsx));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при выгрузке аналитики' });
  }
});

// Ссылки для MAX и Telegram (единая база записей)
router.get('/me/link', authMiddleware, async (req, res) => {
  try {
    const master = await db.query(
      `SELECT id, name, last_name, salon_name, address, city, public_slug
       FROM masters WHERE id = $1`,
      [req.masterId]
    );
    if (master.rows.length === 0) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const row = master.rows[0];
    const publicSlug = row.public_slug || await assignUniqueSlug(db, row);
    const { links, encodedMasterId, clientUrl } = buildMasterLinks(req.masterId, { publicSlug });
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

router.get('/me/billing', authMiddleware, requireOwner, async (req, res) => {
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

router.post('/me/billing/topup', authMiddleware, requireOwner, async (req, res) => {
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

    const masterRow = await getMasterBillingRow(req.masterId);
    if (!masterRow) return res.status(404).json({ error: 'Мастер не найден' });

    const localPaymentId = uuidv4();
    await db.query(
      `INSERT INTO billing_payments (id, master_id, yookassa_payment_id, amount, purpose, status)
       VALUES ($1, $2, NULL, $3, 'topup', 'pending')`,
      [localPaymentId, req.masterId, amount]
    );

    const paymentDescription = `Пополнение баланса Woner.ru (${amount} ₽)`;
    const payment = await createPayment({
      amount,
      description: paymentDescription,
      metadata: { master_id: req.masterId, purpose: 'topup' },
      returnUrl: buildBillingReturnUrl(localPaymentId),
      customerEmail: masterRow.email
    });

    await db.query(
      `UPDATE billing_payments SET yookassa_payment_id = $1 WHERE id = $2`,
      [payment.id, localPaymentId]
    );

    res.json({
      paymentId: payment.id,
      localPaymentId,
      confirmationUrl: payment.confirmation?.confirmation_url
    });
  } catch (error) {
    console.error('Topup error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Не удалось создать платёж' });
  }
});

router.post('/me/billing/unlimited', authMiddleware, requireOwner, async (req, res) => {
  try {
    if (!isBillingEnabled()) {
      return res.status(403).json({ error: 'Оплата пока недоступна — сервис бесплатный' });
    }
    if (!isYookassaConfigured()) {
      return res.status(503).json({ error: 'Платёжная система не настроена' });
    }

    const masterRow = await getMasterBillingRow(req.masterId);
    if (!masterRow) return res.status(404).json({ error: 'Мастер не найден' });

    const localPaymentId = uuidv4();
    await db.query(
      `INSERT INTO billing_payments (id, master_id, yookassa_payment_id, amount, purpose, status)
       VALUES ($1, $2, NULL, $3, 'unlimited', 'pending')`,
      [localPaymentId, req.masterId, UNLIMITED_PRICE]
    );

    const paymentDescription = `Тариф «Безлимит» Woner.ru (${UNLIMITED_PRICE} ₽ / 30 дней)`;
    const payment = await createPayment({
      amount: UNLIMITED_PRICE,
      description: paymentDescription,
      metadata: { master_id: req.masterId, purpose: 'unlimited' },
      returnUrl: buildBillingReturnUrl(localPaymentId),
      customerEmail: masterRow.email
    });

    await db.query(
      `UPDATE billing_payments SET yookassa_payment_id = $1 WHERE id = $2`,
      [payment.id, localPaymentId]
    );

    res.json({
      paymentId: payment.id,
      localPaymentId,
      confirmationUrl: payment.confirmation?.confirmation_url
    });
  } catch (error) {
    console.error('Unlimited purchase error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Не удалось создать платёж' });
  }
});

router.get('/me/billing/payment/:paymentRef', authMiddleware, requireOwner, async (req, res) => {
  try {
    const result = await resolveBillingPaymentReturn(req.masterId, req.params.paymentRef);
    if (!result) {
      return res.status(404).json({ error: 'Платёж не найден' });
    }
    res.json(result);
  } catch (error) {
    console.error('Billing payment status error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Не удалось проверить статус оплаты' });
  }
});

router.put('/me/billing/auto-renew', authMiddleware, requireOwner, async (req, res) => {
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
    const params = [req.masterId];
    let scopeSql = '';
    if (req.isTeamMember && req.salonMasterId) {
      params.push(req.salonMasterId);
      scopeSql = ` AND b.salon_master_id = $${params.length}`;
    }
    const result = await db.query(
      `SELECT b.*, c.name as client_name, c.phone as client_phone, c.messenger, c.max_user_id, c.telegram_user_id
       FROM blacklist b
       LEFT JOIN clients c ON b.client_id = c.id
       WHERE b.master_id = $1${scopeSql}
       ORDER BY b.created_at DESC`,
      params
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
    const salonMasterId = req.isTeamMember ? req.salonMasterId : req.body.salon_master_id || null;
    const result = await db.query(
      `INSERT INTO blacklist (master_id, salon_master_id, client_id, phone, name, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.masterId, salonMasterId, client_id || null, phone || null, name || null, reason.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при добавлении в чёрный список' });
  }
});

router.delete('/me/blacklist/:id', authMiddleware, async (req, res) => {
  try {
    const params = [req.params.id, req.masterId];
    let scopeSql = '';
    if (req.isTeamMember && req.salonMasterId) {
      params.push(req.salonMasterId);
      scopeSql = ` AND salon_master_id = $${params.length}`;
    }
    await db.query(`DELETE FROM blacklist WHERE id = $1 AND master_id = $2${scopeSql}`, params);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка при удалении из чёрного списка' });
  }
});

router.get('/me/blacklist/check', authMiddleware, async (req, res) => {
  try {
    const { client_id, phone } = req.query;
    if (!client_id && !phone) return res.json({ blocked: false });
    let result;
    if (client_id) {
      result = await db.query(
        'SELECT 1 FROM blacklist WHERE master_id = $1 AND client_id = $2 LIMIT 1',
        [req.masterId, client_id]
      );
    } else {
      result = await db.query(
        'SELECT 1 FROM blacklist WHERE master_id = $1 AND phone = $2 LIMIT 1',
        [req.masterId, phone]
      );
    }
    res.json({ blocked: result.rows.length > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка проверки' });
  }
});

module.exports = router;
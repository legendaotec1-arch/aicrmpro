const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const router = express.Router();

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
    cb(null, path.join(__dirname, '../../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// Получить данные мастера (публичные)
router.get('/:masterId', async (req, res) => {
  try {
    const { masterId } = req.params;

    const master = await db.query(
      `SELECT id, name, salon_name, logo_url, description, phone, address,
              latitude, longitude, yandex_maps_link
       FROM masters WHERE id = $1`,
      [masterId]
    );

    if (master.rows.length === 0) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const portfolio = await db.query(
      'SELECT id, image_url, title FROM portfolio WHERE master_id = $1 ORDER BY sort_order',
      [masterId]
    );

    const priceList = await db.query(
      `SELECT id, name, price, duration_minutes, image_url
       FROM price_items WHERE master_id = $1 AND is_active = true ORDER BY sort_order`,
      [masterId]
    );

    res.json({
      master: master.rows[0],
      portfolio: portfolio.rows,
      priceList: priceList.rows
    });
  } catch (error) {
    console.error('Error fetching master:', error);
    res.status(500).json({ error: 'Ошибка при получении данных' });
  }
});

// Получить свои данные (авторизованный мастер)
router.get('/me/profile', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, name, salon_name, logo_url, description, phone,
              address, latitude, longitude, yandex_maps_link, created_at
       FROM masters WHERE id = $1`,
      [req.masterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении профиля' });
  }
});

// Обновить профиль мастера
router.put('/me/profile', authMiddleware, async (req, res) => {
  try {
    const { name, salon_name, description, phone, address, latitude, longitude, yandex_maps_link } = req.body;

    await db.query(
      `UPDATE masters SET
        name = COALESCE($1, name),
        salon_name = COALESCE($2, salon_name),
        description = COALESCE($3, description),
        phone = COALESCE($4, phone),
        address = COALESCE($5, address),
        latitude = COALESCE($6, latitude),
        longitude = COALESCE($7, longitude),
        yandex_maps_link = COALESCE($8, yandex_maps_link),
        updated_at = NOW()
       WHERE id = $9`,
      [name, salon_name, description, phone, address, latitude, longitude, yandex_maps_link, req.masterId]
    );

    res.json({ success: true });
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

// Получить расписание работы
router.get('/me/schedule', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM work_schedule WHERE master_id = $1 ORDER BY day_of_week',
      [req.masterId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении расписания' });
  }
});

// Сохранить расписание работы
router.post('/me/schedule', authMiddleware, async (req, res) => {
  try {
    const { schedule } = req.body;

    // Удаляем существующее расписание
    await db.query('DELETE FROM work_schedule WHERE master_id = $1', [req.masterId]);

    // Вставляем новое
    for (const day of schedule) {
      await db.query(
        `INSERT INTO work_schedule (id, master_id, day_of_week, start_time, end_time, is_day_off)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), req.masterId, day.day_of_week, day.start_time, day.end_time, day.is_day_off || false]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ error: 'Ошибка при сохранении расписания' });
  }
});

// Получить исключения в расписании
router.get('/me/exceptions', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM schedule_exceptions WHERE master_id = $1 ORDER BY exception_date',
      [req.masterId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении исключений' });
  }
});

// Добавить исключение
router.post('/me/exceptions', authMiddleware, async (req, res) => {
  try {
    const { exception_date, is_working, start_time, end_time } = req.body;

    await db.query(
      `INSERT INTO schedule_exceptions (id, master_id, exception_date, is_working, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (master_id, exception_date)
       DO UPDATE SET is_working = $4, start_time = $5, end_time = $6`,
      [uuidv4(), req.masterId, exception_date, is_working, start_time, end_time]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при добавлении исключения' });
  }
});

// Получить прайс-лист
router.get('/me/prices', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM price_items WHERE master_id = $1 ORDER BY sort_order',
      [req.masterId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении прайс-листа' });
  }
});

// Добавить/обновить позицию прайс-листа
router.post('/me/prices', authMiddleware, async (req, res) => {
  try {
    const { id, name, price, duration_minutes, image_url, sort_order, is_active } = req.body;

    if (id) {
      await db.query(
        `UPDATE price_items SET name = $1, price = $2, duration_minutes = $3,
         image_url = $4, sort_order = $5, is_active = $6 WHERE id = $7 AND master_id = $8`,
        [name, price, duration_minutes, image_url, sort_order || 0, is_active !== false, id, req.masterId]
      );
    } else {
      await db.query(
        `INSERT INTO price_items (id, master_id, name, price, duration_minutes, image_url, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uuidv4(), req.masterId, name, price, duration_minutes, image_url, sort_order || 0, is_active !== false]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving price:', error);
    res.status(500).json({ error: 'Ошибка при сохранении прайс-листа' });
  }
});

// Удалить позицию прайс-листа
router.delete('/me/prices/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM price_items WHERE id = $1 AND master_id = $2', [req.params.id, req.masterId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении позиции' });
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
    const result = await db.query(
      'SELECT * FROM portfolio WHERE master_id = $1 ORDER BY sort_order',
      [req.masterId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении портфолио' });
  }
});

// Добавить фото в портфолио
router.post('/me/portfolio', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const { title, sort_order } = req.body;
    const image_url = `/uploads/${req.file.filename}`;

    await db.query(
      'INSERT INTO portfolio (id, master_id, image_url, title, sort_order) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), req.masterId, image_url, title, sort_order || 0]
    );

    res.json({ success: true, image_url });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при добавлении фото' });
  }
});

// Удалить фото из портфолио
router.delete('/me/portfolio/:id', authMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM portfolio WHERE id = $1 AND master_id = $2', [req.params.id, req.masterId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении фото' });
  }
});

// Получить всех клиентов мастера
router.get('/me/clients', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT c.* FROM clients c
       JOIN appointments a ON c.id = a.client_id
       WHERE a.master_id = $1
       ORDER BY c.name`,
      [req.masterId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении клиентов' });
  }
});

// Рассылка клиентам
router.post('/me/broadcast', authMiddleware, async (req, res) => {
  try {
    const { message, client_ids } = req.body;

    let clients;
    if (client_ids && client_ids.length > 0) {
      clients = await db.query(
        'SELECT max_user_id FROM clients WHERE max_user_id IS NOT NULL AND id = ANY($1)',
        [client_ids]
      );
    } else {
      clients = await db.query('SELECT max_user_id FROM clients WHERE max_user_id IS NOT NULL');
    }

    console.log(`Рассылка для ${clients.rows.length} клиентов:`, message);

    res.json({ success: true, recipients: clients.rows.length });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при отправке рассылки' });
  }
});

// Получить ссылку мастера
router.get('/me/link', authMiddleware, async (req, res) => {
  try {
    const master = await db.query('SELECT id FROM masters WHERE id = $1', [req.masterId]);
    if (master.rows.length === 0) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const link = `https://aicrmpro.ru/m/${Buffer.from(req.masterId).toString('base64')}`;
    res.json({ link });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при генерации ссылки' });
  }
});

module.exports = router;
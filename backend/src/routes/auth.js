const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const router = express.Router();

// Регистрация мастера
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, salon_name } = req.body;

    // Проверяем, существует ли уже мастер
    const existing = await db.query('SELECT id FROM masters WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Мастер с таким email уже существует' });
    }

    // Хешируем пароль
    const password_hash = await bcrypt.hash(password, 10);

    // Создаем мастера
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO masters (id, email, password_hash, name, salon_name, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id, email, name, salon_name`,
      [id, email, password_hash, name, salon_name || null]
    );

    const master = result.rows[0];

    // Генерируем токен
    const token = jwt.sign(
      { masterId: master.id, email: master.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({ token, master });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

// Вход мастера
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Находим мастера
    const result = await db.query('SELECT * FROM masters WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const master = result.rows[0];

    // Проверяем пароль
    const validPassword = await bcrypt.compare(password, master.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // Генерируем токен
    const token = jwt.sign(
      { masterId: master.id, email: master.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ 
      token, 
      master: {
        id: master.id,
        email: master.email,
        name: master.name,
        salon_name: master.salon_name,
        logo_url: master.logo_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

// Проверка токена
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

    const result = await db.query('SELECT id, email, name, salon_name FROM masters WHERE id = $1', [decoded.masterId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ valid: false });
    }

    res.json({ valid: true, master: result.rows[0] });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
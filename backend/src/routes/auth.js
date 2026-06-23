const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { ensureDefaultSalonMaster } = require('../utils/salonMasters');
const { grantRegistrationBonus } = require('../utils/billing');
const { signMasterToken, verifyMasterToken } = require('../utils/masterAuth');

const router = express.Router();

function ownerPayload(master) {
  return {
    id: master.id,
    email: master.email,
    name: master.name,
    last_name: master.last_name,
    salon_name: master.salon_name,
    logo_url: master.logo_url,
    role: 'owner'
  };
}

function teamPayload(row) {
  return {
    id: row.salon_id,
    email: row.email,
    name: row.name,
    salon_name: row.salon_name,
    logo_url: row.salon_logo,
    role: 'team',
    salonMasterId: row.id,
    commission_percent: Number(row.commission_percent || 0)
  };
}

// Регистрация владельца салона
router.post('/register', [
  body('email').trim().isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('password').trim().isLength({ min: 6 }),
  body('name').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, last_name, salon_name } = req.body;

    const existing = await db.query('SELECT id FROM masters WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Мастер с таким email уже существует' });
    }

    const teamEmail = await db.query(
      `SELECT id FROM salon_masters WHERE LOWER(email) = LOWER($1) AND email IS NOT NULL`,
      [email]
    );
    if (teamEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Этот email уже используется мастером салона' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO masters (id, email, password_hash, name, last_name, salon_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, email, name, last_name, salon_name, logo_url`,
      [id, email, password_hash, name, last_name || null, salon_name || null]
    );

    const master = result.rows[0];
    await ensureDefaultSalonMaster(master.id, { name: master.name });

    try {
      await grantRegistrationBonus(master.id);
    } catch (bonusErr) {
      console.error('Registration bonus error:', bonusErr);
    }

    const token = signMasterToken({ role: 'owner', masterId: master.id, email: master.email });
    res.status(201).json({ token, master: ownerPayload(master) });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

// Вход: владелец салона или мастер команды
router.post('/login', [
  body('email').trim().isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('password').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Проверьте email и пароль',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    const ownerRes = await db.query('SELECT * FROM masters WHERE LOWER(email) = LOWER($1)', [email]);
    if (ownerRes.rows.length > 0) {
      const master = ownerRes.rows[0];
      const validPassword = await bcrypt.compare(password, master.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }
      const token = signMasterToken({ role: 'owner', masterId: master.id, email: master.email });
      return res.json({ token, master: ownerPayload(master) });
    }

    const teamRes = await db.query(
      `SELECT sm.*, m.salon_name, m.logo_url AS salon_logo
       FROM salon_masters sm
       JOIN masters m ON m.id = sm.salon_id
       WHERE LOWER(sm.email) = LOWER($1) AND sm.is_active = TRUE`,
      [email]
    );
    if (teamRes.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const team = teamRes.rows[0];
    if (!team.password_hash) {
      return res.status(401).json({ error: 'Для этого мастера не задан пароль. Обратитесь к владельцу салона.' });
    }
    const validTeamPassword = await bcrypt.compare(password, team.password_hash);
    if (!validTeamPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = signMasterToken({
      role: 'team',
      masterId: team.salon_id,
      salonMasterId: team.id,
      email: team.email
    });
    res.json({ token, master: teamPayload(team) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyMasterToken(token);

    if (decoded.role === 'team' && decoded.salonMasterId) {
      const teamRes = await db.query(
        `SELECT sm.*, m.salon_name, m.logo_url AS salon_logo
         FROM salon_masters sm
         JOIN masters m ON m.id = sm.salon_id
         WHERE sm.id = $1 AND sm.salon_id = $2 AND sm.is_active = TRUE`,
        [decoded.salonMasterId, decoded.masterId]
      );
      if (teamRes.rows.length === 0) {
        return res.status(401).json({ valid: false });
      }
      return res.json({ valid: true, master: teamPayload(teamRes.rows[0]) });
    }

    const result = await db.query(
      'SELECT id, email, name, last_name, salon_name, logo_url FROM masters WHERE id = $1',
      [decoded.masterId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ valid: false });
    }

    res.json({ valid: true, master: ownerPayload(result.rows[0]) });
  } catch {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;

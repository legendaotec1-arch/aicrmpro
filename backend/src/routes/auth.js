const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { ensureDefaultSalonMaster } = require('../utils/salonMasters');
const { grantRegistrationBonus } = require('../utils/billing');
const { signMasterToken, verifyMasterToken } = require('../utils/masterAuth');
const { assignUniqueSlug } = require('../seo/masterSeo');
const {
  ensureMasterEmailSchema,
  findMasterAccountByEmail,
  sendMasterVerificationCode,
  verifyMasterEmailCode,
  randomPasswordHash,
} = require('../utils/masterEmailAuth');
const { isEmailConfigured } = require('../utils/email');

const router = express.Router();

function ownerPayload(master) {
  return {
    id: master.id,
    email: master.email,
    name: master.name,
    last_name: master.last_name,
    salon_name: master.salon_name,
    logo_url: master.logo_url,
    role: 'owner',
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
    commission_percent: Number(row.commission_percent || 0),
  };
}

function issueTokenForAccount(account) {
  if (account.role === 'team') {
    const team = account.team;
    return {
      token: signMasterToken({
        role: 'team',
        masterId: team.salon_id,
        salonMasterId: team.id,
        email: team.email,
      }),
      master: teamPayload(team),
    };
  }
  return {
    token: signMasterToken({ role: 'owner', masterId: account.master.id, email: account.master.email }),
    master: ownerPayload(account.master),
  };
}

function smtpErrorResponse(res) {
  return res.status(503).json({
    error: 'SMTP не настроен. Настройте SMTP_HOST, SMTP_USER, SMTP_PASS в .env',
  });
}

async function completeMasterRegistration(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const { name, last_name, salon_name, ref, partner_ref } = payload;

  const existing = await db.query('SELECT id FROM masters WHERE LOWER(email) = LOWER($1)', [email]);
  if (existing.rows.length > 0) {
    const err = new Error('EXISTS');
    err.code = 'EXISTS';
    throw err;
  }

  const teamEmail = await db.query(
    `SELECT id FROM salon_masters WHERE LOWER(email) = LOWER($1) AND email IS NOT NULL`,
    [email]
  );
  if (teamEmail.rows.length > 0) {
    const err = new Error('TEAM_EMAIL');
    err.code = 'TEAM_EMAIL';
    throw err;
  }

  const partnerExists = await db.query('SELECT id FROM partners WHERE LOWER(email) = LOWER($1)', [email]);
  if (partnerExists.rows.length > 0) {
    const err = new Error('PARTNER_EMAIL');
    err.code = 'PARTNER_EMAIL';
    throw err;
  }

  const password_hash = await randomPasswordHash();
  const id = uuidv4();
  const result = await db.query(
    `INSERT INTO masters (id, email, password_hash, name, last_name, salon_name, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING id, email, name, last_name, salon_name, logo_url`,
    [id, email, password_hash, name, last_name || null, salon_name || null]
  );

  const master = result.rows[0];
  await ensureDefaultSalonMaster(master.id, { name: master.name });
  try {
    await assignUniqueSlug(db, master);
  } catch (slugErr) {
    console.error('Master slug assign error:', slugErr.message);
  }

  try {
    await grantRegistrationBonus(master.id);
  } catch (bonusErr) {
    console.error('Registration bonus error:', bonusErr);
  }

  const referralCode = ref || partner_ref;
  if (referralCode) {
    try {
      const { attachMasterToPartner } = require('../utils/partnerProgram');
      await attachMasterToPartner(master.id, referralCode);
    } catch (refErr) {
      console.error('Partner referral attach error:', refErr.message);
    }
  }

  return master;
}

// Регистрация: отправка кода на email
router.post('/register', [
  body('email').trim().isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('name').trim().notEmpty(),
], async (req, res) => {
  try {
    await ensureMasterEmailSchema();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = String(req.body.email).trim().toLowerCase();
    const { name, last_name, salon_name, ref, partner_ref } = req.body;

    const account = await findMasterAccountByEmail(email);
    if (account) {
      return res.status(400).json({ error: 'Мастер с таким email уже существует. Войдите по коду из письма.' });
    }

    const partnerExists = await db.query('SELECT id FROM partners WHERE LOWER(email) = LOWER($1)', [email]);
    if (partnerExists.rows.length > 0) {
      return res.status(400).json({ error: 'Этот email уже используется в партнёрском кабинете' });
    }

    const referralCode = ref || partner_ref || req.body.ref;
    const { sent, devCode, smtpConfigured } = await sendMasterVerificationCode(email, {
      purpose: 'register',
      payload: {
        email,
        name: name.trim(),
        last_name: last_name?.trim() || null,
        salon_name: salon_name?.trim() || null,
        ref: referralCode || null,
        partner_ref: referralCode || null,
      },
    });

    if (!sent && process.env.NODE_ENV === 'production' && smtpConfigured) {
      return res.status(503).json({ error: 'Не удалось отправить письмо с кодом' });
    }
    if (!sent && process.env.NODE_ENV === 'production' && !smtpConfigured) {
      return smtpErrorResponse(res);
    }

    res.status(201).json({
      email,
      needsVerification: true,
      message: 'Код подтверждения отправлен на email',
      devCode,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

// Вход: отправка кода на email
router.post('/login', [
  body('email').trim().isEmail().normalizeEmail({ gmail_remove_dots: false }),
], async (req, res) => {
  try {
    await ensureMasterEmailSchema();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = String(req.body.email).trim().toLowerCase();
    const account = await findMasterAccountByEmail(email);
    if (!account) {
      return res.status(404).json({ error: 'Аккаунт не найден. Создайте кабинет на странице регистрации.' });
    }

    if (account.role === 'team' && !account.team.email) {
      return res.status(400).json({ error: 'Для этого мастера не задан email. Обратитесь к владельцу салона.' });
    }

    const { sent, devCode, smtpConfigured } = await sendMasterVerificationCode(email, { purpose: 'login' });

    if (!sent && process.env.NODE_ENV === 'production' && smtpConfigured) {
      return res.status(503).json({ error: 'Не удалось отправить письмо с кодом' });
    }
    if (!sent && process.env.NODE_ENV === 'production' && !smtpConfigured) {
      return smtpErrorResponse(res);
    }

    res.json({
      email,
      needsVerification: true,
      message: 'Код для входа отправлен на email',
      devCode,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

router.post('/verify-email', [
  body('email').trim().isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('code').trim().isLength({ min: 4, max: 8 }),
], async (req, res) => {
  try {
    await ensureMasterEmailSchema();
    const { email, code } = req.body;
    const normalized = String(email).trim().toLowerCase();

    const verified = await verifyMasterEmailCode(normalized, code);
    if (!verified) {
      return res.status(400).json({ error: 'Неверный или просроченный код' });
    }

    if (verified.purpose === 'register') {
      const payload = verified.payload || {};
      if (!payload.name || !payload.email) {
        return res.status(400).json({ error: 'Данные регистрации устарели. Заполните форму заново.' });
      }

      try {
        const master = await completeMasterRegistration(payload);
        const token = signMasterToken({ role: 'owner', masterId: master.id, email: master.email });
        return res.json({ token, master: ownerPayload(master) });
      } catch (err) {
        if (err.code === 'EXISTS') {
          return res.status(400).json({ error: 'Аккаунт уже создан. Войдите по коду из письма.' });
        }
        if (err.code === 'TEAM_EMAIL') {
          return res.status(400).json({ error: 'Этот email уже используется мастером салона' });
        }
        if (err.code === 'PARTNER_EMAIL') {
          return res.status(400).json({ error: 'Этот email уже используется в партнёрском кабинете' });
        }
        throw err;
      }
    }

    const account = await findMasterAccountByEmail(normalized);
    if (!account) {
      return res.status(404).json({ error: 'Аккаунт не найден' });
    }

    const session = issueTokenForAccount(account);
    return res.json(session);
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Ошибка подтверждения' });
  }
});

router.post('/resend-code', [
  body('email').trim().isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('purpose').optional().isIn(['login', 'register']),
], async (req, res) => {
  try {
    await ensureMasterEmailSchema();
    const email = String(req.body.email).trim().toLowerCase();
    const purpose = req.body.purpose || 'login';

    if (purpose === 'login') {
      const account = await findMasterAccountByEmail(email);
      if (!account) {
        return res.status(404).json({ error: 'Аккаунт не найден' });
      }
      const { sent, devCode } = await sendMasterVerificationCode(email, { purpose: 'login' });
      return res.json({ sent, devCode, message: 'Код отправлен повторно' });
    }

    const { name, last_name, salon_name, ref, partner_ref } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Укажите имя для повторной отправки кода регистрации' });
    }

    const { sent, devCode } = await sendMasterVerificationCode(email, {
      purpose: 'register',
      payload: {
        email,
        name: name.trim(),
        last_name: last_name?.trim() || null,
        salon_name: salon_name?.trim() || null,
        ref: ref || partner_ref || null,
        partner_ref: ref || partner_ref || null,
      },
    });
    return res.json({ sent, devCode, message: 'Код отправлен повторно' });
  } catch (err) {
    console.error('Resend code error:', err);
    res.status(500).json({ error: 'Ошибка отправки кода' });
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

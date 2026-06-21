const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { resolveJwtSecret } = require('./jwtConfig');

const JWT_SECRET = resolveJwtSecret();

function signMasterToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

function verifyMasterToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function attachSession(req, decoded) {
  req.role = decoded.role === 'team' ? 'team' : 'owner';
  req.masterId = decoded.masterId;
  req.salonMasterId = decoded.salonMasterId || null;
  req.sessionEmail = decoded.email || null;
  req.isTeamMember = req.role === 'team';
}

async function masterAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyMasterToken(token);
    attachSession(req, decoded);

    if (req.isTeamMember && req.salonMasterId) {
      const active = await db.query(
        'SELECT is_active FROM salon_masters WHERE id = $1 AND salon_id = $2',
        [req.salonMasterId, req.masterId]
      );
      if (!active.rows[0] || active.rows[0].is_active === false) {
        return res.status(403).json({ error: 'Доступ отключён' });
      }
    }

    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
}

function requireOwner(req, res, next) {
  if (req.isTeamMember) {
    return res.status(403).json({ error: 'Недостаточно прав' });
  }
  next();
}

module.exports = {
  signMasterToken,
  verifyMasterToken,
  attachSession,
  masterAuthMiddleware,
  requireOwner,
  resolveJwtSecret: () => JWT_SECRET
};

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

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

function masterAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyMasterToken(token);
    attachSession(req, decoded);
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
  requireOwner
};

const jwt = require('jsonwebtoken');
const { resolveJwtSecret } = require('./jwtConfig');

const JWT_SECRET = resolveJwtSecret();

function signPartnerToken(partner) {
  return jwt.sign(
    {
      role: 'partner',
      partnerId: partner.id,
      email: partner.email,
    },
    JWT_SECRET,
    { expiresIn: process.env.PARTNER_JWT_EXPIRES_IN || '30d' }
  );
}

function verifyPartnerToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.role !== 'partner') {
    throw new Error('Invalid partner token');
  }
  return decoded;
}

function partnerAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    const decoded = verifyPartnerToken(authHeader.split(' ')[1]);
    req.partnerId = decoded.partnerId;
    req.partnerEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
}

module.exports = {
  signPartnerToken,
  verifyPartnerToken,
  partnerAuthMiddleware,
};

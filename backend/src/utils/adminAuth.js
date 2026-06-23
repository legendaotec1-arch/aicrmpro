const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { resolveJwtSecret } = require('./jwtConfig');
const { listAdminAccounts } = require('./adminWorkspace');

const JWT_SECRET = resolveJwtSecret();
const ADMIN_ROLE = 'platform_admin';

function getAdminCredentialPairs() {
  const accounts = listAdminAccounts();
  const pairs = [];
  const ownerEmail = (process.env.SITE_OWNER_EMAIL || '').trim().toLowerCase();
  const ownerPassword = process.env.SITE_OWNER_PASSWORD || '';
  if (ownerEmail && ownerPassword) pairs.push({ email: ownerEmail, password: ownerPassword });

  const partnerEmail = (process.env.SITE_PARTNER_EMAIL || '').trim().toLowerCase();
  const partnerPassword = process.env.SITE_PARTNER_PASSWORD || '';
  if (partnerEmail && partnerPassword) pairs.push({ email: partnerEmail, password: partnerPassword });

  return pairs;
}

function isAdminConfigured() {
  return getAdminCredentialPairs().some((item) => item.email && item.password.length >= 8);
}

function safeEqualStrings(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyAdminCredentials(inputEmail, inputPassword) {
  const normalizedEmail = String(inputEmail || '').trim().toLowerCase();
  const pass = String(inputPassword || '');
  return getAdminCredentialPairs().some(
    (item) => safeEqualStrings(normalizedEmail, item.email) && safeEqualStrings(pass, item.password)
  );
}

function signAdminToken(email) {
  return jwt.sign(
    { role: ADMIN_ROLE, email: String(email || '').trim().toLowerCase() },
    JWT_SECRET,
    { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '7d' }
  );
}

function verifyAdminToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.role !== ADMIN_ROLE) {
    throw new Error('Invalid admin token');
  }
  return decoded;
}

function adminAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Не авторизован' });
    }
    const decoded = verifyAdminToken(authHeader.split(' ')[1]);
    req.adminEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
}

module.exports = {
  ADMIN_ROLE,
  isAdminConfigured,
  verifyAdminCredentials,
  signAdminToken,
  verifyAdminToken,
  adminAuthMiddleware,
  listAdminAccounts,
};

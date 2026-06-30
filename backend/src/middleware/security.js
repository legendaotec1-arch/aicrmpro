/**
 * In-memory rate limiter + временный бан IP.
 * Не идеально для кластера, но достаточно чтобы прикрыть случайный флуд
 * (сканеры порта 5432, брутфорс admin endpoints и т.п.) на одной машине.
 */

const WINDOWS = new Map(); // key -> [timestamp, ...]
const BANS = new Map();    // ip -> unbanAt

const DEFAULT_LIMITS = {
  // общее окно для всех запросов
  global: { windowMs: 60_000, max: 600 },
  // админские эндпоинты — жёстче
  admin: { windowMs: 60_000, max: 120 },
  // логин — особенно жёстко
  auth:  { windowMs: 60_000, max: 20 }
};

const BAN_THRESHOLD = 60;        // нарушений за окно
const BAN_WINDOW_MS = 5 * 60_000; // бан на 5 минут
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now) {
  for (const [k, arr] of WINDOWS) {
    while (arr.length && arr[0] < now) arr.shift();
    if (!arr.length) WINDOWS.delete(k);
  }
  for (const [ip, unbanAt] of BANS) {
    if (unbanAt <= now) BANS.delete(ip);
  }
}

let lastSweep = 0;
function maybeSweep(now) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  sweep(now);
}

function bucketKey(scope, ip) {
  return `${scope}:${ip}`;
}

function noteHit(scope, ip, limit, now) {
  const key = bucketKey(scope, ip);
  let arr = WINDOWS.get(key);
  if (!arr) {
    arr = [];
    WINDOWS.set(key, arr);
  }
  arr.push(now);
  while (arr.length && arr[0] < now - limit.windowMs) arr.shift();
  return arr.length;
}

function clientIp(req) {
  // express уже доверяет X-Forwarded-For если включено trust proxy
  return req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
}

function pickScope(req) {
  const path = req.originalUrl.split('?')[0];
  if (path.startsWith('/api/admin')) return 'admin';
  if (path.startsWith('/api/auth') || path === '/api/login' || path === '/api/register') return 'auth';
  return 'global';
}

function securityMiddleware(req, res, next) {
  const now = Date.now();
  maybeSweep(now);

  const ip = clientIp(req);

  // бан
  const banUntil = BANS.get(ip);
  if (banUntil && banUntil > now) {
    const retryAfter = Math.ceil((banUntil - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Too many requests', retryAfter });
  }

  const scope = pickScope(req);
  const limit = DEFAULT_LIMITS[scope] || DEFAULT_LIMITS.global;
  const hits = noteHit(scope, ip, limit, now);

  if (hits > limit.max) {
    if (hits > BAN_THRESHOLD) {
      BANS.set(ip, now + BAN_WINDOW_MS);
    }
    const retryAfter = Math.ceil(limit.windowMs / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ error: 'Too many requests', retryAfter });
  }

  next();
}

module.exports = { securityMiddleware, _state: { WINDOWS, BANS } };
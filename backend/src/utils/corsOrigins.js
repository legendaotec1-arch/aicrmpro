function parseAllowedOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const defaults = [
    process.env.FRONTEND_URL,
    process.env.PUBLIC_URL,
    'https://woner.ru',
    'https://www.woner.ru'
  ].filter(Boolean);

  return [...new Set([...fromEnv, ...defaults])];
}

function createCorsOriginChecker() {
  const allowed = parseAllowedOrigins();
  return (origin, callback) => {
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked: ${origin}`));
  };
}

module.exports = { parseAllowedOrigins, createCorsOriginChecker };

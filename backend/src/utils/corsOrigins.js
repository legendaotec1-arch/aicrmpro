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
    // false = без CORS-заголовков, но ответ отдаётся (не 500 на статике)
    callback(null, false);
  };
}

module.exports = { parseAllowedOrigins, createCorsOriginChecker };

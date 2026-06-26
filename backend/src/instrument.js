const Sentry = require('@sentry/node');

const dsn = (process.env.SENTRY_DSN || '').trim();

if (!dsn) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[sentry] SENTRY_DSN не задан — мониторинг ошибок отключён');
  }
} else {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    sendDefaultPii: false,
  });
}

module.exports = Sentry;

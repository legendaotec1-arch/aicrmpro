import { bootSentryAfterConsent } from '../instrument.js';

/** Запуск аналитики (Sentry) после согласия пользователя */
export function bootAnalyticsAfterConsent() {
  bootSentryAfterConsent();
}

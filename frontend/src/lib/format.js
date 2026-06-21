export function formatDate(date, options = {}) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options
  });
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDateTime(date) {
  return `${formatDate(date)} · ${formatTime(date)}`;
}

export function reviewCountLabel(count) {
  const n = Number(count) || 0;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} отзывов`;
  if (mod10 === 1) return `${n} отзыв`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} отзыва`;
  return `${n} отзывов`;
}

export function formatPrice(value) {
  if (value == null || value === '') return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(Number(value));
}

/** Отображение цены услуги: фикс / от / до / диапазон */
export function formatServicePrice(item) {
  if (!item) return '—';
  const type = item.price_type || 'fixed';
  const price = Number(item.price);
  const priceMax = item.price_max != null ? Number(item.price_max) : null;
  if (!Number.isFinite(price)) return '—';

  if (type === 'from') return `от ${formatPrice(price)}`;
  if (type === 'to') return `до ${formatPrice(price)}`;
  if (type === 'range' && Number.isFinite(priceMax)) {
    return `${formatPrice(price)} – ${formatPrice(priceMax)}`;
  }
  return formatPrice(price);
}

export const STATUS_LABELS = {
  confirmed: { label: 'Подтверждена', tone: 'success' },
  cancelled: { label: 'Отменена', tone: 'danger' },
  completed: { label: 'Завершена', tone: 'neutral' }
};

export const DAYS = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота'
];

export const CHANNEL_LABELS = { max: 'MAX', telegram: 'Telegram' };

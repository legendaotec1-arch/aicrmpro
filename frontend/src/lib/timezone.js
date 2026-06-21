export const RUSSIAN_TIMEZONES = [
  { id: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { id: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { id: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { id: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { id: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { id: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { id: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { id: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { id: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { id: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { id: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' }
];

export const DEFAULT_TIMEZONE = 'Europe/Moscow';

export function normalizeTimezone(timezone) {
  const value = String(timezone || '').trim();
  if (RUSSIAN_TIMEZONES.some((z) => z.id === value)) return value;
  return DEFAULT_TIMEZONE;
}

export function getClientTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function formatInTimezone(iso, timezone, options = {}) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: normalizeTimezone(timezone),
    ...options
  }).format(new Date(iso));
}

export function formatSalonTime(iso, timezone) {
  return formatInTimezone(iso, timezone, { hour: '2-digit', minute: '2-digit' });
}

export function formatSalonDateTime(iso, timezone) {
  return formatInTimezone(iso, timezone, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatSalonDate(iso, timezone) {
  return formatInTimezone(iso, timezone, {
    day: 'numeric',
    month: 'long',
    weekday: 'long'
  });
}

export function timezonesDiffer(a, b) {
  return normalizeTimezone(a) !== normalizeTimezone(b);
}

export function clientLocalHint(iso, salonTimezone) {
  const clientTz = getClientTimezone();
  if (!timezonesDiffer(salonTimezone, clientTz)) return null;
  const salonTime = formatSalonTime(iso, salonTimezone);
  const clientTime = formatSalonTime(iso, clientTz);
  if (salonTime === clientTime) return null;
  const clientLabel = RUSSIAN_TIMEZONES.find((z) => z.id === clientTz)?.label
    || clientTz.replace('_', ' ');
  return `У вас: ${clientTime} (${clientLabel})`;
}

const DEFAULT_SALON_TIMEZONE = process.env.DEFAULT_SALON_TIMEZONE || 'Europe/Moscow';

const RUSSIAN_TIMEZONES = [
  { id: 'Europe/Kaliningrad', label: 'Калининград', offset: 'UTC+2' },
  { id: 'Europe/Moscow', label: 'Москва', offset: 'UTC+3' },
  { id: 'Europe/Samara', label: 'Самара', offset: 'UTC+4' },
  { id: 'Asia/Yekaterinburg', label: 'Екатеринбург', offset: 'UTC+5' },
  { id: 'Asia/Omsk', label: 'Омск', offset: 'UTC+6' },
  { id: 'Asia/Krasnoyarsk', label: 'Красноярск', offset: 'UTC+7' },
  { id: 'Asia/Irkutsk', label: 'Иркутск', offset: 'UTC+8' },
  { id: 'Asia/Yakutsk', label: 'Якутск', offset: 'UTC+9' },
  { id: 'Asia/Vladivostok', label: 'Владивосток', offset: 'UTC+10' },
  { id: 'Asia/Magadan', label: 'Магадан', offset: 'UTC+11' },
  { id: 'Asia/Kamchatka', label: 'Камчатка', offset: 'UTC+12' }
];

const ALLOWED_TIMEZONE_IDS = new Set(RUSSIAN_TIMEZONES.map((z) => z.id));

function pad2(n) {
  return String(n).padStart(2, '0');
}

function normalizeTimezone(timezone) {
  const value = String(timezone || '').trim();
  if (ALLOWED_TIMEZONE_IDS.has(value)) return value;
  return DEFAULT_SALON_TIMEZONE;
}

function getLocalParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeTimezone(timeZone),
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(date instanceof Date ? date : new Date(date));

  const get = (type) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute')
  };
}

function localToUtcMs(y, mo, d, h, mi, timeZone) {
  let guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  for (let i = 0; i < 5; i += 1) {
    const local = getLocalParts(new Date(guess), timeZone);
    const target = Date.UTC(y, mo - 1, d, h, mi);
    const actual = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
    const delta = target - actual;
    guess += delta;
    if (delta === 0) break;
  }
  return guess;
}

function getTimezoneOffsetIso(timeZone, utcDate) {
  const date = utcDate instanceof Date ? utcDate : new Date(utcDate);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeTimezone(timeZone),
    timeZoneName: 'longOffset'
  }).formatToParts(date);
  const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+00:00';
  const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return '+00:00';
  return `${match[1]}${pad2(parseInt(match[2], 10))}:${pad2(parseInt(match[3] || '0', 10))}`;
}

function dayOfWeekFromDateStr(dateStr) {
  const [y, mo, d] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

function formatSalonIso(dateStr, hour, minute, timeZone = DEFAULT_SALON_TIMEZONE) {
  const tz = normalizeTimezone(timeZone);
  const [y, mo, d] = String(dateStr).split('-').map(Number);
  const utcMs = localToUtcMs(y, mo, d, hour, minute, tz);
  const offset = getTimezoneOffsetIso(tz, utcMs);
  return `${dateStr}T${pad2(hour)}:${pad2(minute)}:00${offset}`;
}

function parseSalonIso(iso) {
  return new Date(iso);
}

function salonDateFromAppointmentTime(appointmentTime, timeZone = DEFAULT_SALON_TIMEZONE) {
  const instant = new Date(appointmentTime);
  if (Number.isNaN(instant.getTime())) {
    const s = String(appointmentTime);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return todayInTimezone(timeZone);
  }
  return new Intl.DateTimeFormat('en-CA', { timeZone: normalizeTimezone(timeZone) }).format(instant);
}

function todayInTimezone(timeZone = DEFAULT_SALON_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: normalizeTimezone(timeZone) }).format(new Date());
}

function getTimezoneLabel(timeZone) {
  const tz = normalizeTimezone(timeZone);
  const entry = RUSSIAN_TIMEZONES.find((z) => z.id === tz);
  if (entry) return `${entry.label} (${entry.offset})`;
  return tz;
}

function listRussianTimezones() {
  return RUSSIAN_TIMEZONES.map(({ id, label, offset }) => ({
    id,
    label: `${label} (${offset})`
  }));
}

/** @deprecated use formatSalonIso with timezone */
const SALON_TZ_OFFSET = process.env.SALON_TZ_OFFSET || '+03:00';

module.exports = {
  DEFAULT_SALON_TIMEZONE,
  RUSSIAN_TIMEZONES,
  SALON_TZ_OFFSET,
  normalizeTimezone,
  listRussianTimezones,
  getTimezoneLabel,
  getTimezoneOffsetIso,
  dayOfWeekFromDateStr,
  formatSalonIso,
  parseSalonIso,
  salonDateFromAppointmentTime,
  todayInTimezone,
  getLocalParts,
  localToUtcMs
};

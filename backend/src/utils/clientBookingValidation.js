const { isRuPhoneComplete, normalizeRuPhoneForStorage } = require('./phoneRu');

const PLACEHOLDER_NAMES = new Set([
  'гость',
  'guest',
  'клиент',
  'client',
  'пользователь',
  'user',
  'без имени',
  'аноним',
  'anonymous'
]);

function isValidClientName(name) {
  const trimmed = String(name || '').trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2) return false;
  if (PLACEHOLDER_NAMES.has(trimmed.toLowerCase())) return false;
  if (!/[a-zA-Zа-яА-ЯёЁ]/.test(trimmed)) return false;
  return true;
}

function validateBookingContact({ name, phone, requirePhone = true }) {
  const phoneStr = String(phone || '').trim();
  if (requirePhone && !isRuPhoneComplete(phone)) {
    return { ok: false, error: 'Укажите номер телефона в формате +7 999 123 4567' };
  }
  if (!requirePhone && phoneStr && !isRuPhoneComplete(phone)) {
    return { ok: false, error: 'Номер телефона указан не полностью. Формат: +7 999 123 4567' };
  }

  if (!isValidClientName(name)) {
    return {
      ok: false,
      error: 'Укажите настоящее имя. «Гость», «Клиент» и пустые значения не допускаются'
    };
  }

  const normalizedPhone = phoneStr ? normalizeRuPhoneForStorage(phone) : null;
  if (requirePhone && !normalizedPhone) {
    return { ok: false, error: 'Укажите номер телефона в формате +7 999 123 4567' };
  }

  return {
    ok: true,
    name: String(name).trim().replace(/\s+/g, ' '),
    phone: normalizedPhone
  };
}

module.exports = {
  isValidClientName,
  validateBookingContact
};

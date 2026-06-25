const MIN_LENGTH = 2;
const MAX_LENGTH = 255;
const HAS_LETTER = /[a-zA-Zа-яА-ЯёЁ]/;

function normalizeServiceName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function validateServiceName(name) {
  const trimmed = normalizeServiceName(name);
  if (!trimmed) {
    return { ok: false, error: 'Укажите название услуги' };
  }
  if (trimmed.length < MIN_LENGTH) {
    return { ok: false, error: 'Название услуги должно быть не короче 2 символов' };
  }
  if (trimmed.length > MAX_LENGTH) {
    return { ok: false, error: `Название не длиннее ${MAX_LENGTH} символов` };
  }
  if (!HAS_LETTER.test(trimmed)) {
    return {
      ok: false,
      error: 'Название должно содержать буквы, а не только символы или цифры',
    };
  }
  return { ok: true, value: trimmed };
}

module.exports = {
  validateServiceName,
  normalizeServiceName,
};

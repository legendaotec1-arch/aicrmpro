const MIN_LENGTH = 2;
const MAX_LENGTH = 255;
const HAS_LETTER = /[a-zA-Zа-яА-ЯёЁ]/;

export function normalizeServiceName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

export function getServiceNameError(name) {
  const trimmed = normalizeServiceName(name);
  if (!trimmed) return 'Укажите название услуги';
  if (trimmed.length < MIN_LENGTH) return 'Название услуги должно быть не короче 2 символов';
  if (trimmed.length > MAX_LENGTH) return `Название не длиннее ${MAX_LENGTH} символов`;
  if (!HAS_LETTER.test(trimmed)) {
    return 'Название должно содержать буквы, а не только символы или цифры';
  }
  return null;
}

export function isValidServiceName(name) {
  return getServiceNameError(name) === null;
}

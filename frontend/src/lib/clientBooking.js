import { isRuPhoneComplete, normalizeRuPhoneForStorage } from './phoneRu';

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

export function isValidClientName(name) {
  const trimmed = String(name || '').trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2) return false;
  if (PLACEHOLDER_NAMES.has(trimmed.toLowerCase())) return false;
  if (!/[a-zA-Zа-яА-ЯёЁ]/.test(trimmed)) return false;
  return true;
}

export function getClientNameError(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'Введите ваше имя';
  if (PLACEHOLDER_NAMES.has(trimmed.toLowerCase())) {
    return 'Укажите настоящее имя, а не «Гость» или «Клиент»';
  }
  if (!isValidClientName(name)) return 'Имя слишком короткое или некорректное';
  return null;
}

export function canSubmitBooking({ name, phone }) {
  return isValidClientName(name) && isRuPhoneComplete(phone);
}

export { isRuPhoneComplete, normalizeRuPhoneForStorage };

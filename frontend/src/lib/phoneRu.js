/** Оставляет до 10 цифр номера после кода страны */
export function digitsFromRuPhone(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.startsWith('8')) d = d.slice(1);
  if (d.startsWith('7')) d = d.slice(1);
  return d.slice(0, 10);
}

/** Отображение: +7 993 933 0070 */
export function formatRuPhoneDisplay(input) {
  const d = digitsFromRuPhone(input);
  if (!d.length) return '+7';
  let out = '+7';
  if (d.length > 0) out += ` ${d.slice(0, 3)}`;
  if (d.length > 3) out += ` ${d.slice(3, 6)}`;
  if (d.length > 6) out += ` ${d.slice(6, 10)}`;
  return out;
}

export function normalizeRuPhoneForStorage(input) {
  const d = digitsFromRuPhone(input);
  if (d.length === 10) return `+7${d}`;
  return String(input || '').trim();
}

export function toTelHref(phone) {
  const d = digitsFromRuPhone(phone);
  if (d.length < 10) {
    const raw = String(phone || '').replace(/\s/g, '');
    if (raw.startsWith('+') || raw.startsWith('tel:')) return raw.startsWith('tel:') ? raw : `tel:${raw}`;
    return null;
  }
  return `tel:+7${d}`;
}

export function isRuPhoneComplete(input) {
  return digitsFromRuPhone(input).length === 10;
}

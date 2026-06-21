function digitsFromRuPhone(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.startsWith('8')) d = d.slice(1);
  if (d.startsWith('7') && d.length > 10) d = d.slice(1);
  return d.slice(0, 10);
}

function isRuPhoneComplete(input) {
  return digitsFromRuPhone(input).length === 10;
}

function normalizeRuPhoneForStorage(input) {
  const d = digitsFromRuPhone(input);
  if (d.length === 10) return `+7${d}`;
  return null;
}

function pickBetterPhone(current, next) {
  if (isRuPhoneComplete(next)) return normalizeRuPhoneForStorage(next);
  if (isRuPhoneComplete(current)) return normalizeRuPhoneForStorage(current);
  return null;
}

function displayPhone(input) {
  if (!isRuPhoneComplete(input)) return null;
  return normalizeRuPhoneForStorage(input);
}

module.exports = {
  digitsFromRuPhone,
  isRuPhoneComplete,
  normalizeRuPhoneForStorage,
  pickBetterPhone,
  displayPhone
};

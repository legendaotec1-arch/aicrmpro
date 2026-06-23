const KEY = 'partner_token';

export function getPartnerToken() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function savePartnerToken(token) {
  localStorage.setItem(KEY, token);
}

export function clearPartnerToken() {
  localStorage.removeItem(KEY);
}

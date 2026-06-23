const TOKEN_KEY = 'admin_token';

export function saveAdminToken(token) {
  let saved = false;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    saved = true;
  } catch {
    // ignore
  }
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    saved = true;
  } catch {
    // ignore
  }
  if (!saved) throw new Error('STORAGE_BLOCKED');
}

export function getAdminToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return sessionStorage.getItem(TOKEN_KEY);
  }
}

export function clearAdminToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

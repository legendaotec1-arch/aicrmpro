const STORAGE_PREFIX = 'mc45_client_';

function trace(stage, extra) {
  try {
    // Lazy import avoids circular deps in main bundle
    import('./bootLog.js').then((m) => m.bootLog(stage, extra)).catch(() => {});
  } catch {
    /* ignore */
  }
}

function uniqueKeys(keys) {
  return [...new Set((Array.isArray(keys) ? keys : [keys]).filter(Boolean).map(String))];
}

export function parseClientTokenParam(ct) {
  try {
    const part = String(ct || '').split('.')[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = atob(b64);
    const payload = JSON.parse(json);
    if (payload.typ !== 'client' || !payload.channel || !payload.userId) return null;
    return {
      channel: payload.channel,
      userId: String(payload.userId),
      clientToken: String(ct),
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function isClientTokenFresh(token, skewSec = 60) {
  try {
    const parsed = parseClientTokenParam(token);
    if (!parsed?.exp) return true;
    return parsed.exp * 1000 > Date.now() + skewSec * 1000;
  } catch {
    return false;
  }
}

export function isClientSessionValid(session) {
  return Boolean(
    session?.channel
    && session?.userId
    && session?.clientToken
    && isClientTokenFresh(session.clientToken)
  );
}

function readKey(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
      || sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.channel || !data?.userId || !data?.clientToken) return null;
    if (!isClientTokenFresh(data.clientToken)) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      sessionStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** Ключи для одного салона: slug, uuid, encoded id из URL */
export function clientSessionKeys(routeMasterId, master) {
  return uniqueKeys([routeMasterId, master?.id, master?.public_slug]);
}

export function getClientSession(...keys) {
  for (const key of uniqueKeys(keys)) {
    const session = readKey(key);
    if (session) return session;
  }
  return null;
}

export function setClientSession(keys, session) {
  const list = uniqueKeys(keys);
  if (!list.length || !session?.channel || !session?.userId || !session?.clientToken) return;
  const raw = JSON.stringify(session);
  let saved = 0;
  for (const key of list) {
    try {
      const storageKey = STORAGE_PREFIX + key;
      if (localStorage.getItem(storageKey) === raw) {
        saved += 1;
        continue;
      }
      localStorage.setItem(storageKey, raw);
      saved += 1;
    } catch (err) {
      trace('CLIENT_TOKEN_SAVE_FAIL', { storage: 'localStorage', message: String(err?.message || err).slice(0, 80) });
    }
    try {
      const storageKey = STORAGE_PREFIX + key;
      if (sessionStorage.getItem(storageKey) !== raw) {
        sessionStorage.setItem(storageKey, raw);
      }
    } catch (err) {
      trace('CLIENT_TOKEN_SAVE_FAIL', { storage: 'sessionStorage', message: String(err?.message || err).slice(0, 80) });
    }
  }
  if (saved > 0) trace('CLIENT_TOKEN_SAVE_OK', { keys: list.length });
}

export function clearClientSession(...keys) {
  for (const key of uniqueKeys(keys)) {
    localStorage.removeItem(STORAGE_PREFIX + key);
    sessionStorage.removeItem(STORAGE_PREFIX + key);
  }
}

const STORAGE_PREFIX = 'mc45_client_';

export function getClientSession(masterIdEncoded) {
  if (!masterIdEncoded) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + masterIdEncoded);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.channel || !data?.userId || !data?.clientToken) return null;
    return data;
  } catch {
    return null;
  }
}

export function setClientSession(masterIdEncoded, session) {
  if (!masterIdEncoded || !session?.channel || !session?.userId) return;
  sessionStorage.setItem(STORAGE_PREFIX + masterIdEncoded, JSON.stringify(session));
}

export function clearClientSession(masterIdEncoded) {
  if (!masterIdEncoded) return;
  sessionStorage.removeItem(STORAGE_PREFIX + masterIdEncoded);
}

const RETRY_KEY = 'woner_asset_reload';

function canUseStorage(storage) {
  try {
    storage.setItem(RETRY_KEY, '1');
    storage.removeItem(RETRY_KEY);
    return true;
  } catch {
    return false;
  }
}

function getRetryStorage() {
  if (canUseStorage(sessionStorage)) return sessionStorage;
  if (canUseStorage(localStorage)) return localStorage;
  return null;
}

/** One automatic reload when hashed JS/CSS from a stale index.html fails to load. */
export function installStaleBundleRecovery() {
  const storage = getRetryStorage();

  window.addEventListener('load', () => {
    try {
      sessionStorage.removeItem(RETRY_KEY);
      localStorage.removeItem(RETRY_KEY);
    } catch {
      // ignore
    }
  });

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (!target || (target.tagName !== 'SCRIPT' && target.tagName !== 'LINK')) return;

      const url = target.src || target.href || '';
      if (!url.includes('/assets/')) return;
      if (storage && storage.getItem(RETRY_KEY)) return;

      if (storage) storage.setItem(RETRY_KEY, '1');
      const next = new URL(window.location.href);
      next.searchParams.set('_cb', String(Date.now()));
      if (!next.searchParams.has('pwa')) next.searchParams.set('pwa', '1');
      window.location.replace(next.toString());
    },
    true
  );
}

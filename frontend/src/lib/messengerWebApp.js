export function getMessengerDeeplinkFromUrl(search = typeof window !== 'undefined' ? window.location.search : '') {
  try {
    const params = new URLSearchParams(search);
    const channel = params.get('ch');
    const userId = params.get('uid');
    const exp = params.get('exp');
    const sig = params.get('sig');
    if (!userId || !exp || !sig) return null;
    if (channel !== 'max' && channel !== 'telegram') return null;
    return { channel, userId, exp, sig };
  } catch {
    return null;
  }
}

export function sessionMatchesDeeplink(session, deeplink) {
  if (!deeplink || !session?.clientToken) return false;
  return session.channel === deeplink.channel && String(session.userId) === String(deeplink.userId);
}

function isTelegramMessengerUA(ua = '') {
  return /Telegram/i.test(ua);
}

function isMaxMessengerUA(ua = '') {
  return /\bMAX\b/i.test(ua) || /\[MAX\]/i.test(ua) || /MaxApp/i.test(ua);
}

export function isTelegramWebApp() {
  try {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      if ((tg.initData || '').length > 0) return true;
      const platform = String(tg.platform || '').toLowerCase();
      if (platform && platform !== 'unknown') return true;
    }
    return isTelegramMessengerUA(navigator.userAgent || '');
  } catch {
    return false;
  }
}

export function isMaxWebApp() {
  try {
    return isMaxMessengerUA(navigator.userAgent || '');
  } catch {
    return false;
  }
}

export function isMessengerWebApp() {
  return isTelegramWebApp() || isMaxWebApp();
}

export function messengerChannelLabel() {
  if (isMaxWebApp()) return 'MAX';
  if (isTelegramWebApp()) return 'Telegram';
  return 'мессенджер';
}

export function isIOS() {
  try {
    return (
      /iPad|iPhone|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  } catch {
    return false;
  }
}

/** backdrop-filter ломает рендер в iOS WebView (TG/MAX) */
export function messengerBackdropFilter(blur) {
  if (isIOS() && isMessengerWebApp()) return undefined;
  return blur;
}

export function cleanBookingPageUrl(session) {
  try {
    const url = new URL(window.location.href);
    ['ch', 'uid', 'exp', 'sig', 'rv', 'ct'].forEach((key) => url.searchParams.delete(key));
    if (!url.searchParams.get('tab')) url.searchParams.set('tab', 'booking');
    const code = url.searchParams.get('a');
    if (!code && session?.clientToken) {
      /* сессия уже в localStorage */
    }
    return url.toString();
  } catch {
    return window.location.href;
  }
}

export function openBookingInSystemBrowser(session) {
  const url = cleanBookingPageUrl(session);
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) {
      tg.openLink(url);
      return;
    }
  } catch {
    /* ignore */
  }
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    window.location.assign(url);
  }
}

export function initMessengerWebApp() {
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.ready?.();
    tg.expand?.();
    if (typeof tg.enableClosingConfirmation === 'function') {
      tg.enableClosingConfirmation(false);
    }
  } catch {
    /* ignore */
  }
}

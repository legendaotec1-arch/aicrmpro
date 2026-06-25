/** iOS Safari / WebView performance helpers */

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

/** backdrop-filter сильно тормозит iOS при частых перерисовках */
export function iosBackdropFilter(blur) {
  if (isIOS()) return undefined;
  return blur;
}

export function iosScrollBehavior() {
  return isIOS() ? 'auto' : 'smooth';
}

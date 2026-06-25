/** Мобильные браузеры (iOS Safari, Android Chrome) — нижняя панель не видна в DevTools на ПК. */
export function isMobileWeb() {
  try {
    return (
      /Android|iPad|iPhone|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  } catch {
    return false;
  }
}

export function installMobileViewportInsets() {
  if (!isMobileWeb()) return () => {};

  const root = document.documentElement;
  root.classList.add('mobile-env');

  const update = () => {
    const vv = window.visualViewport;
    if (!vv) {
      root.style.setProperty('--mobile-vv-bottom', '0px');
      return;
    }
    const overlap = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    root.style.setProperty('--mobile-vv-bottom', `${overlap}px`);
  };

  const vv = window.visualViewport;
  vv?.addEventListener('resize', update);
  vv?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  update();

  return () => {
    vv?.removeEventListener('resize', update);
    vv?.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
    root.classList.remove('mobile-env');
    root.style.removeProperty('--mobile-vv-bottom');
  };
}

const BUILD_META = 'meta[name="app-build"]';

/** Перезагрузка, если index.html новее загруженного бандла админки */
export function ensureFreshAdminBundle() {
  if (!window.location.pathname.startsWith('/admin')) return;

  const meta = document.querySelector(BUILD_META);
  const htmlBuild = meta?.getAttribute('content') || '';
  const jsBuild = typeof __APP_BUILD_ID__ !== 'undefined' ? String(__APP_BUILD_ID__) : '';

  if (!htmlBuild || !jsBuild || htmlBuild === jsBuild) return;

  const key = `woner_admin_build_reload_${htmlBuild}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');

  const url = new URL(window.location.href);
  url.searchParams.set('_cb', String(Date.now()));
  window.location.replace(url.toString());
}

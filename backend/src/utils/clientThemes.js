const DEFAULT_CLIENT_THEME = 'basic';

const THEME_IDS = [
  'basic'
];

const THEME_CATALOG = [
  { id: 'basic', name: 'Базовая', niche: 'Стандартная тема' }
];

function normalizeClientTheme(value) {
  const id = String(value || '').trim();
  return THEME_IDS.includes(id) ? id : DEFAULT_CLIENT_THEME;
}

function listClientThemesCatalog() {
  return THEME_CATALOG;
}

module.exports = {
  DEFAULT_CLIENT_THEME,
  THEME_IDS,
  normalizeClientTheme,
  listClientThemesCatalog
};

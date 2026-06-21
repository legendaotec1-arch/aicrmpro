import { lightTheme } from './clientThemeFactory';

export { REVIEW_STAR_FILL, REVIEW_STAR_EMPTY, contrastOnAccent } from './clientThemeFactory';

export const DEFAULT_CLIENT_THEME = 'basic';

/** @typedef {{ id: string, name: string, niche: string, category: string, preview: [string,string,string], vars: Record<string,string> }} ClientTheme */

/** @type {ClientTheme[]} */
export const CLIENT_THEMES = [
  lightTheme({
    id: 'basic',
    name: 'Базовая',
    niche: 'Серебристый фон, оранжевые кнопки',
    preview: ['#F5F5F5', '#6A5ACD', '#1A1A1A'],
    bg: '#F5F5F5',
    bgSoft: 'rgba(220, 220, 220, 0.5)',
    surface: 'rgba(255, 255, 255, 0.92)',
    surfaceSolid: '#FFFFFF',
    border: 'rgba(0, 0, 0, 0.06)',
    borderSoft: 'rgba(0, 0, 0, 0.08)',
    text: '#1A1A1A',
    textMuted: '#666666',
    accent: '#6A5ACD',
    accentHover: '#5A4CBD',
    accentSoft: 'rgba(106, 90, 205, 0.1)',
    accentMuted: 'rgba(106, 90, 205, 0.25)',
    accentRing: 'rgba(106, 90, 205, 0.35)',
    onAccent: '#FFFFFF',
    heroGradient: 'linear-gradient(135deg, #F5F5F5 0%, rgba(220, 220, 220, 0.5) 100%)',
    headerBg: 'rgba(255, 255, 255, 0.96)',
    tabBarBg: 'rgba(255, 255, 255, 0.92)',
    callBg: 'rgba(106, 90, 205, 0.1)',
    callText: '#6A5ACD',
    callBorder: '#6A5ACD'
  })
];

export const THEME_SECTIONS = [
  {
    id: 'basic',
    title: 'Базовая',
    description: 'Серебристый фон, оранжевые кнопки'
  }
];

export function getThemesBySection(sectionId) {
  if (sectionId === 'basic') return CLIENT_THEMES;
  return [];
}

export function getClientTheme(themeId) {
  return CLIENT_THEMES.find((t) => t.id === themeId) || CLIENT_THEMES[0];
}

export function clientThemeCssVars(themeId) {
  const v = getClientTheme(themeId).vars;
  return {
    '--ct-bg': v.bg,
    '--ct-bg-soft': v.bgSoft,
    '--ct-surface': v.surface,
    '--ct-surface-solid': v.surfaceSolid,
    '--ct-border': v.border,
    '--ct-border-soft': v.borderSoft,
    '--ct-text': v.text,
    '--ct-text-muted': v.textMuted,
    '--ct-accent': v.accent,
    '--ct-accent-hover': v.accentHover,
    '--ct-accent-muted': v.accentMuted,
    '--ct-accent-soft': v.accentSoft,
    '--ct-accent-ring': v.accentRing,
    '--ct-on-accent': v.onAccent,
    '--ct-hero-gradient': v.heroGradient,
    '--ct-shell-gradient': v.shellGradient || 'none',
    '--ct-star-fill': v.starFill,
    '--ct-star-empty': v.starEmpty,
    '--ct-header-bg': v.headerBg,
    '--ct-tab-bar-bg': v.tabBarBg,
    '--ct-call-bg': v.callBg,
    '--ct-call-text': v.callText,
    '--ct-call-border': v.callBorder
  };
}

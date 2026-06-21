/** Звёзды отзывов — всегда жёлтые, не зависят от темы */
export const REVIEW_STAR_FILL = '#FBBF24';
export const REVIEW_STAR_EMPTY = '#D1D5DB';

function hexLuminance(hex) {
  const h = String(hex).replace('#', '');
  if (h.length < 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastOnAccent(accentHex) {
  return hexLuminance(accentHex) > 0.52 ? '#1C1917' : '#FFFFFF';
}

/**
 * @param {object} p
 * @returns {import('./clientThemes').ClientTheme}
 */
export function makeTheme(p) {
  const {
    id,
    name,
    niche,
    category = 'classic',
    preview,
    bg,
    bgSoft,
    surface,
    border,
    borderSoft,
    text,
    textMuted,
    accent,
    accentHover,
    accentSoft,
    accentMuted,
    accentRing,
    onAccent,
    heroGradient,
    shellGradient = null,
    headerBg,
    tabBarBg,
    callBg,
    callText,
    callBorder,
    isDark = false
  } = p;

  const safeOnAccent = onAccent || contrastOnAccent(accent);

  return {
    id,
    name,
    niche,
    category,
    preview: preview || [bg, accent, text],
    vars: {
      bg,
      bgSoft,
      surface,
      border,
      borderSoft,
      text,
      textMuted,
      accent,
      accentHover: accentHover || accent,
      accentSoft,
      accentMuted,
      accentRing,
      onAccent: safeOnAccent,
      heroGradient,
      shellGradient: shellGradient || '',
      starFill: REVIEW_STAR_FILL,
      starEmpty: REVIEW_STAR_EMPTY,
      headerBg,
      tabBarBg,
      callBg,
      callText,
      callBorder,
      isDark: isDark ? '1' : '0'
    }
  };
}

/** Светлая тема с гарантированным контрастом */
export function lightTheme(p) {
  return makeTheme({
    ...p,
    category: p.category || 'classic',
    isDark: false,
    headerBg: p.headerBg || '#FFFFFF',
    tabBarBg: p.tabBarBg || '#FFFFFF'
  });
}

/** Тёмная тема */
export function darkTheme(p) {
  return makeTheme({
    ...p,
    category: p.category || 'classic',
    isDark: true,
    headerBg: p.headerBg || '#FFFFFF',
    tabBarBg: p.tabBarBg || '#FFFFFF'
  });
}

/** Тема с градиентным фоном страницы */
export function gradientTheme(p) {
  const isDark = p.isDark ?? p.category === 'gradient-dark';
  return makeTheme({
    ...p,
    bg: p.bg || (isDark ? '#0F172A' : '#FFF5F7'),
    isDark,
    shellGradient: p.shellGradient
  });
}

import { clientThemeCssVars, getClientTheme } from '../../config/clientThemes';

export default function ClientThemeRoot({ themeId, children, className = '', style = {} }) {
  const theme = getClientTheme(themeId);
  const hasGradient = Boolean(theme.vars.shellGradient);

  return (
    <div
      data-client-theme={theme.id}
      data-theme-category={theme.category}
      data-theme-dark={theme.vars.isDark === '1' ? 'true' : 'false'}
      data-theme-gradient={hasGradient ? 'true' : 'false'}
      className={`client-shell ${className}`.trim()}
      style={{ ...clientThemeCssVars(theme.id), ...style }}
    >
      {children}
    </div>
  );
}

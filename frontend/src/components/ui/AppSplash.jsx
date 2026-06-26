import { BRAND_TLD, BRAND_WORD } from '../../config/brand';
import './app-splash.css';

function statusLabel(label) {
  return String(label || 'Загрузка').replace(/\.{3}$|…$/u, '').trim();
}

export default function AppSplash({
  label = 'Загрузка',
  fullScreen = true,
  className = '',
}) {
  const text = statusLabel(label);

  return (
    <div
      className={`woner-splash ${fullScreen ? 'woner-splash--fullscreen' : 'woner-splash--inline'} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={`${text} ${BRAND_WORD}${BRAND_TLD}`}
    >
      <div className="woner-splash__glow" aria-hidden="true" />
      <div className="woner-splash__loader" aria-hidden="true">
        <div className="woner-splash__ring woner-splash__ring--outer" />
        <div className="woner-splash__ring woner-splash__ring--inner" />
        <div className="woner-splash__core" />
      </div>
      <p className="woner-splash__brand">
        <span className="woner-splash__word">{BRAND_WORD}</span>
        <span className="woner-splash__tld">{BRAND_TLD}</span>
      </p>
      {text ? (
        <p className="woner-splash__status">
          <span>{text}</span>
          <span className="woner-splash__dots" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
      ) : null}
    </div>
  );
}

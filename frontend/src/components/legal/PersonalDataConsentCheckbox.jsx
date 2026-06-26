import { Link } from 'react-router-dom';
import { SITE_LEGAL } from '../../config/siteLegal';

const CONSENT_PATH = SITE_LEGAL.personalDataConsentPath;

function ConsentLink({ className, style }) {
  return (
    <Link
      to={CONSENT_PATH}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
    >
      Согласием на обработку персональных данных
    </Link>
  );
}

function PrivacyLink({ className, style }) {
  return (
    <Link
      to="/legal/privacy"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
    >
      Политикой обработки персональных данных
    </Link>
  );
}

/**
 * Отдельный unchecked-чекбокс согласия на ПДн (ст. 9 152-ФЗ, ФЗ-420 с 01.09.2025).
 * @param {'master' | 'client' | 'partner'} variant
 */
export default function PersonalDataConsentCheckbox({
  checked,
  onChange,
  variant = 'master',
  masterTitle,
  id = 'pd-consent',
  className,
  labelClassName,
  checkboxClassName,
  linkClassName,
  linkStyle,
}) {
  const linkProps = {
    className: linkClassName || 'text-primary hover:underline',
    style: linkStyle,
  };

  let text;
  if (variant === 'client') {
    text = (
      <>
        Даю согласие на обработку моих персональных данных для оформления и подтверждения записи
        {masterTitle ? <> у «{masterTitle}»</> : null} на условиях <ConsentLink {...linkProps} />. Ознакомлен(а) с{' '}
        <PrivacyLink {...linkProps} />.
      </>
    );
  } else {
    text = (
      <>
        Даю согласие на обработку моих персональных данных на условиях <ConsentLink {...linkProps} />. Ознакомлен(а) с{' '}
        <PrivacyLink {...linkProps} />.
      </>
    );
  }

  const labelCls =
    labelClassName || 'flex gap-3 cursor-pointer text-sm text-ink-secondary leading-snug';
  const checkboxCls =
    checkboxClassName || 'mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary';

  return (
    <label className={className || labelCls} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className={checkboxCls}
      />
      <span>{text}</span>
    </label>
  );
}

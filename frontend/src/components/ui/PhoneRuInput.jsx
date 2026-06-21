import { digitsFromRuPhone, formatRuPhoneDisplay } from '../../lib/phoneRu';

export default function PhoneRuInput({ label = 'Телефон', value, onChange, required, hint, className = '' }) {
  const handleChange = (e) => {
    const formatted = formatRuPhoneDisplay(e.target.value);
    onChange(formatted);
  };

  const handleFocus = () => {
    if (!value || value === '+7') return;
    if (!String(value).trim()) onChange('+7');
  };

  const handleKeyDown = (e) => {
    const pos = e.target.selectionStart;
    if ((e.key === 'Backspace' || e.key === 'Delete') && pos <= 3) {
      e.preventDefault();
    }
  };

  return (
    <div className={className}>
      {label && <label className="label-field">{label}</label>}
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        required={required}
        value={value || '+7'}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="+7 999 123 4567"
        className="input-field"
      />
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      {required && digitsFromRuPhone(value).length > 0 && digitsFromRuPhone(value).length < 10 && (
        <p className="mt-1 text-xs text-amber-600">Введите 10 цифр после +7</p>
      )}
    </div>
  );
}

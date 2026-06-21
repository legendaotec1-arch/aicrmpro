import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, hint, error, className = '', ...props }, ref) {
  return (
    <div className={className}>
      {label && <label className="label-field">{label}</label>}
      <input ref={ref} className={`input-field ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`} {...props} />
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
});

export default Input;

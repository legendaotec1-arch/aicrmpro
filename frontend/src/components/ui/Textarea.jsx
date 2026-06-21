export default function Textarea({ label, error, className = '', rows = 3, ...props }) {
  return (
    <div className={className}>
      {label && <label className="label-field">{label}</label>}
      <textarea
        rows={rows}
        className={`input-field resize-y min-h-[88px] ${error ? 'border-danger' : ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

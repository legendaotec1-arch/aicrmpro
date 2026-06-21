export default function Card({ children, className = '', padding = true, dark = false }) {
  return (
    <div
      className={`rounded-xl ${padding ? 'p-4' : ''} bg-white border border-admin-border shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }) {
  return (
    <div className="mb-4 pb-3 border-b border-admin-border">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold text-base text-admin-text">{title}</h2>
          {description && <p className="text-sm text-admin-textSecondary">{description}</p>}
        </div>
        {action ? (
          <div className="w-full shrink-0 sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}

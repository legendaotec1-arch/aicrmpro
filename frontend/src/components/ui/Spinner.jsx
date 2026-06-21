export default function Spinner({ className = 'h-8 w-8' }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-primary/30 border-t-primary ${className}`} />
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
      <Spinner className="h-10 w-10" />
      <p className="text-sm text-ink-muted">Загрузка...</p>
    </div>
  );
}

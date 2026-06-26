import AppSplash from './AppSplash';

export default function Spinner({ className = 'h-8 w-8' }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-primary/30 border-t-primary ${className}`}
      role="status"
      aria-label="Загрузка"
    />
  );
}

export function PageLoader({ label }) {
  return <AppSplash label={label} fullScreen />;
}

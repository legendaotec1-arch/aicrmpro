import Button from './Button';

export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-admin-accentSoft text-2xl text-admin-accent">
        {icon}
      </div>
      <h3 className="font-semibold text-lg text-admin-text">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-admin-textSecondary">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

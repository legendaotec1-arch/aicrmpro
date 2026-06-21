import { mediaUrl } from '../../lib/media';

function initialsFrom(client) {
  const name = client?.display_name || client?.name || '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name[0] || '?').toUpperCase();
}

export default function ClientAvatar({ client, size = 'md', className = '' }) {
  const sizes = {
    xs: 'h-8 w-8 text-xs',
    sm: 'h-10 w-10 text-sm',
    md: 'h-12 w-12 text-base',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-20 w-20 text-xl'
  };
  const ring = {
    xs: 'ring-1',
    sm: 'ring-2',
    md: 'ring-2',
    lg: 'ring-[3px]',
    xl: 'ring-[3px]'
  };
  const src = client?.photo_url ? mediaUrl(client.photo_url) : null;
  const label = client?.display_name || client?.name || 'Клиент';

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-violet-200 ${sizes[size]} ${ring[size]} ring-white shadow-md ${className}`}
      title={label}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-bold text-primary">
          {initialsFrom(client)}
        </span>
      )}
    </div>
  );
}

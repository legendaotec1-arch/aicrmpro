import { mediaUrl } from '../../lib/media';

function MasterAvatar({ master, size = 'md' }) {
  const sizes = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-12 w-12 text-lg',
    lg: 'h-16 w-16 text-xl'
  };
  const cls = sizes[size] || sizes.md;
  return (
    <div
      className={`${cls} shrink-0 overflow-hidden rounded-full bg-admin-accent flex items-center justify-center`}
    >
      {master.photo_url ? (
        <img src={mediaUrl(master.photo_url)} alt={master.name} className="h-full w-full object-cover" />
      ) : (
        <span className={`font-bold text-white ${size === 'sm' ? 'text-xs' : ''}`}>
          {master.name?.[0] || '?'}
        </span>
      )}
    </div>
  );
}

export default function TeamMasterSelect({
  masters,
  value,
  onChange,
  label = 'Мастер',
  variant = 'default'
}) {
  if (!masters?.length) return null;

  const activeMasters = masters.filter((m) => m.is_active !== false);

  if (variant === 'compact') {
    if (activeMasters.length === 1) {
      const m = activeMasters[0];
      return (
        <div className="flex items-center gap-2.5 rounded-xl border border-admin-border bg-white px-3 py-2">
          <MasterAvatar master={m} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-admin-text">{m.name}</p>
            {m.specialty && (
              <p className="truncate text-xs text-admin-textMuted">{m.specialty}</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        <label className="label-field">{label}</label>
        <select
          className="input-field"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {activeMasters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.specialty ? ` · ${m.specialty}` : ''}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (activeMasters.length === 1) {
    const m = activeMasters[0];
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-admin-bg border border-admin-border">
        <MasterAvatar master={m} size="md" />
        <div className="min-w-0">
          <p className="font-semibold text-admin-text truncate">{m.name}</p>
          {m.specialty && (
            <p className="text-xs text-admin-textMuted truncate">{m.specialty}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-3 block text-sm font-semibold text-admin-text">{label}</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {activeMasters.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              value === m.id
                ? 'border-admin-accent bg-admin-accentSoft shadow-md'
                : 'border-admin-border bg-white hover:border-admin-accent/50 hover:shadow-sm'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${
                value === m.id ? 'ring-2 ring-admin-accent ring-offset-2' : ''
              }`}
            >
              {m.photo_url ? (
                <img src={mediaUrl(m.photo_url)} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-admin-bg flex items-center justify-center">
                  <span className="text-xl font-bold text-admin-accent">{m.name?.[0] || '?'}</span>
                </div>
              )}
            </div>
            <div className="text-center min-w-0 w-full">
              <p
                className={`font-semibold text-sm truncate ${
                  value === m.id ? 'text-admin-accent' : 'text-admin-text'
                }`}
              >
                {m.name}
              </p>
              {m.specialty && (
                <p className="text-xs text-admin-textMuted truncate mt-0.5">{m.specialty}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

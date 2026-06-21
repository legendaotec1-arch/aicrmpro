import { mediaUrl } from '../../lib/media';

export default function TeamMasterSelect({ masters, value, onChange, label = 'Мастер' }) {
  if (!masters?.length) return null;
  if (masters.length === 1) {
    const m = masters[0];
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-admin-bg border border-admin-border">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-admin-accent flex items-center justify-center shrink-0">
          {m.photo_url ? (
            <img src={mediaUrl(m.photo_url)} alt={m.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-white">{m.name?.[0] || '?'}</span>
          )}
        </div>
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
        {masters.filter((m) => m.is_active !== false).map((m) => (
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
            <div className={`w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${
              value === m.id ? 'ring-2 ring-admin-accent ring-offset-2' : ''
            }`}>
              {m.photo_url ? (
                <img src={mediaUrl(m.photo_url)} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-admin-bg flex items-center justify-center">
                  <span className="text-xl font-bold text-admin-accent">{m.name?.[0] || '?'}</span>
                </div>
              )}
            </div>
            <div className="text-center min-w-0 w-full">
              <p className={`font-semibold text-sm truncate ${value === m.id ? 'text-admin-accent' : 'text-admin-text'}`}>
                {m.name}
              </p>
              {m.specialty && (
                <p className="text-xs text-admin-textMuted truncate mt-0.5">{m.specialty}</p>
              )}
            </div>
            {value === m.id && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-admin-accent flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

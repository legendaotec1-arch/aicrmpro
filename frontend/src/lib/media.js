export function mediaUrl(path) {
  if (!path) return null;
  const raw = String(path).trim();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }
  if (raw.startsWith('//')) return `https:${raw}`;
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  if (raw.startsWith('/uploads/') || raw.startsWith('/api/')) return origin ? `${origin}${raw}` : raw;
  if (raw.startsWith('uploads/')) return origin ? `${origin}/${raw}` : `/${raw}`;
  if (raw.startsWith('/')) return origin ? `${origin}${raw}` : raw;
  return origin ? `${origin}/uploads/${raw.replace(/^\/+/, '')}` : `/uploads/${raw.replace(/^\/+/, '')}`;
}

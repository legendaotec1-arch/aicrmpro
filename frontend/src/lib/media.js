export function mediaUrl(path) {
  if (!path) return null;
  const raw = String(path).trim();
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/uploads/') || raw.startsWith('/api/')) return raw;
  if (raw.startsWith('uploads/')) return `/${raw}`;
  if (raw.startsWith('/')) return raw;
  return `/uploads/${raw.replace(/^\/+/, '')}`;
}

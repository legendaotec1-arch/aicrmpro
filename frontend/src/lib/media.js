export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

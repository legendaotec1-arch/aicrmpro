export function withClientAuth(clientAuth, config = {}) {
  const headers = { ...(config.headers || {}) };
  if (clientAuth?.clientToken) {
    headers.Authorization = `Bearer ${clientAuth.clientToken}`;
  }
  return { ...config, headers };
}

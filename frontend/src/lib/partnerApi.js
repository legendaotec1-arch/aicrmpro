import { createApiClient } from './http.js';
import { getPartnerToken } from './partnerStorage.js';

const partnerApi = createApiClient('/api/partner');

partnerApi.interceptors.request.use((config) => {
  const token = getPartnerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function downloadPartnerFile(path, filename) {
  const token = getPartnerToken();
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Ошибка скачивания');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default partnerApi;

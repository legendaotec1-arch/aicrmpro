import { createApiClient } from './http.js';
import { getAdminToken } from './adminStorage.js';

const adminApi = createApiClient('/api/admin');

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default adminApi;

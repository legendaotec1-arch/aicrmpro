import { createApiClient } from './http.js';
import { getAdminToken } from './adminStorage.js';

const seoAdminApi = createApiClient('/api/seo');

seoAdminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default seoAdminApi;

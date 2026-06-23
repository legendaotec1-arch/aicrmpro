import axios from 'axios';

const REQUEST_TIMEOUT_MS = 25000;

function attachRetry(client) {
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      if (!config || config.__retryCount >= 1) {
        return Promise.reject(error);
      }

      const method = (config.method || 'get').toLowerCase();
      if (method !== 'get') {
        return Promise.reject(error);
      }

      const isTimeout = error.code === 'ECONNABORTED';
      const isNetwork = !error.response;
      if (!isTimeout && !isNetwork) {
        return Promise.reject(error);
      }

      config.__retryCount = (config.__retryCount || 0) + 1;
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      return client(config);
    }
  );
}

export function createApiClient(baseURL = '/api') {
  const client = axios.create({
    baseURL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
  });
  attachRetry(client);
  return client;
}

const api = createApiClient('/api');

export default api;

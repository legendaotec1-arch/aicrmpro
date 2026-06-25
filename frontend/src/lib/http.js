import axios from 'axios';

const REQUEST_TIMEOUT_MS = 20000;
const pendingGetControllers = new Map();

function getRequestKey(config) {
  const method = (config.method || 'get').toLowerCase();
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${method}:${config.baseURL || ''}${config.url || ''}:${params}`;
}

function attachRequestDedup(client) {
  client.interceptors.request.use((config) => {
    const method = (config.method || 'get').toLowerCase();
    if (method !== 'get' || config.__skipDedup) return config;

    const key = getRequestKey(config);
    const prev = pendingGetControllers.get(key);
    if (prev) {
      try { prev.abort(); } catch { /* ignore */ }
    }

    const controller = new AbortController();
    config.signal = config.signal || controller.signal;
    pendingGetControllers.set(key, controller);
    config.__dedupKey = key;
    return config;
  });
}

function clearDedupKey(config) {
  if (config?.__dedupKey) pendingGetControllers.delete(config.__dedupKey);
}

function attachRetry(client) {
  client.interceptors.response.use(
    (response) => {
      clearDedupKey(response.config);
      return response;
    },
    async (error) => {
      clearDedupKey(error.config);

      if (axios.isCancel?.(error) || error.code === 'ERR_CANCELED') {
        return Promise.reject(error);
      }

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
      config.__skipDedup = true;
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
  attachRequestDedup(client);
  attachRetry(client);
  return client;
}

const api = createApiClient('/api');

export default api;

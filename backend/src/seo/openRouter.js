const axios = require('axios');

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_MODELS = [
  process.env.OPENROUTER_MODEL,
  'openrouter/free',
  'google/gemma-2-9b-it:free',
  'qwen/qwen-2.5-7b-instruct:free',
].filter(Boolean);

function getApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() || '';
}

function isOpenRouterConfigured() {
  return Boolean(getApiKey());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {object} params
 * @param {import('axios').AxiosRequestConfig['messages']} params.messages
 * @param {string} [params.model]
 * @param {number} [params.temperature]
 * @param {number} [params.maxTokens]
 */
async function chatCompletion({ messages, model, temperature = 0.65, maxTokens = 4096, responseFormat }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY не задан');
  }

  const models = model ? [model, ...DEFAULT_MODELS.filter((m) => m !== model)] : DEFAULT_MODELS;
  let lastError;

  for (const tryModel of models) {
    try {
      const body = {
        model: tryModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      };
      if (responseFormat) {
        body.response_format = responseFormat;
      }

      const res = await axios.post(
        API_URL,
        body,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.SITE_URL || 'https://woner.ru',
            'X-Title': 'Woner.ru SEO Blog',
          },
          // 30 сек: если free-модель молчит, лучше упасть и перейти к следующей,
          // чем зависнуть и отвалиться по таймауту nginx.
          timeout: 30_000,
        }
      );

      const choice = res.data?.choices?.[0];
      const content = choice?.message?.content;
      if (!content) {
        throw new Error(`Пустой ответ модели ${tryModel}`);
      }

      return {
        content: typeof content === 'string' ? content : JSON.stringify(content),
        model: res.data?.model || tryModel,
        usage: res.data?.usage,
      };
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message;
      console.warn(`[openrouter] ${tryModel} failed (${status || 'n/a'}): ${msg}`);
      // 401/403 — токен/доступ, дальше крутить смысла нет
      if (status === 401 || status === 403) break;
      // 4xx кроме 401/403/429 — битый запрос, тоже нет смысла перебирать
      if (status && status >= 400 && status < 500 && status !== 429) break;
    }
  }

  throw lastError || new Error('OpenRouter: все модели недоступны');
}

module.exports = {
  chatCompletion,
  isOpenRouterConfigured,
  getApiKey,
  DEFAULT_MODELS,
};

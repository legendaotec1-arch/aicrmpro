/**
 * Базовый класс адаптера для автосабмита на внешнюю площадку.
 * Каждый адаптер реализует submit(link, db) и возвращает
 * { ok, externalUrl, message, error }.
 */
const axios = require('axios');

class BaseSubmitAdapter {
  constructor(config = {}) {
    this.platform = config.platform;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Подставляет переменные в шаблон.
   * Доступно: {{tracked_url}}, {{site_name}}, {{contact_email}}
   */
  render(template, ctx) {
    if (!template) return '';
    return template
      .replace(/\{\{tracked_url\}\}/g, ctx.trackedUrl || '')
      .replace(/\{\{site_name\}\}/g, ctx.siteName || 'Woner.ru')
      .replace(/\{\{contact_email\}\}/g, ctx.contactEmail || '')
      .replace(/\{\{site\}\}/g, ctx.siteName || 'Woner.ru');
  }

  /**
   * Хелпер для HTTP POST с OAuth/bearer токеном.
   */
  async httpPost(url, { headers = {}, data = null, form = null } = {}) {
    try {
      const res = await axios.post(url, form || data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
        timeout: this.timeout,
        validateStatus: () => true,
      });
      return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data };
    } catch (err) {
      return { ok: false, status: 0, error: err.message };
    }
  }

  async httpGet(url, { headers = {} } = {}) {
    try {
      const res = await axios.get(url, { headers, timeout: this.timeout, validateStatus: () => true });
      return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data };
    } catch (err) {
      return { ok: false, status: 0, error: err.message };
    }
  }

  /** Базовая реализация — адаптер должен переопределить. */
  async submit(/* link, ctx */) {
    throw new Error('submit() not implemented');
  }

  /** Dry-run: показывает, что будет отправлено. */
  async preview(link, ctx) {
    return {
      platform: this.platform,
      endpoint: link.api_endpoint || link.submission_url,
      payload: this.render(link.payload_template || link.content_template, ctx),
    };
  }
}

module.exports = BaseSubmitAdapter;
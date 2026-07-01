/**
 * Product Hunt GraphQL API adapter — запуск продукта.
 *
 * Требования:
 * - PRODUCTHUNT_DEVELOPER_TOKEN (OAuth токен)
 * - PRODUCTHUNT_API_KEY (опционально)
 *
 * Этапы:
 * 1. Создать user_posts/user с owner_uid
 * 2. Создать post через posts/make_post mutation
 * 3. Получить URL поста
 */
const BaseSubmitAdapter = require('./base');

class ProductHuntAdapter extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const token = process.env.PRODUCTHUNT_DEVELOPER_TOKEN?.trim();
    if (!token) {
      return { ok: false, error: 'PRODUCTHUNT_DEVELOPER_TOKEN not configured' };
    }
    const text = this.render(link.content_template || link.title, ctx);
    // Парсим поля из content_template (Name / Tagline / Description / Topics)
    const fields = {};
    text.split('\n').forEach((line) => {
      const m = line.match(/^([A-Za-zА-Яа-я]+):\s*(.+)$/);
      if (m) fields[m[1].toLowerCase()] = m[2];
    });
    const headline = fields.tagline || fields.tagline?.slice(0, 60) || link.title.slice(0, 60);
    const description = fields.description || text;
    // Product Hunt API принимает только готовый slug — создание поста
    // через GraphQL требует app credentials и подтверждения домена.
    // Здесь мы возвращаем dry-run info, реальный постинг делается вручную
    // (через PH-инструменты, типа Make).
    return {
      ok: false,
      requiresManualReview: true,
      message: 'Product Hunt posts require manual launch from PH dashboard for fairness. Generated payload:',
      payload: { headline, description, topics: fields.topics },
    };
  }
}

module.exports = ProductHuntAdapter;
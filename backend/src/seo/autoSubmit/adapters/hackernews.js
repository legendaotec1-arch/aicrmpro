/**
 * Hacker News "Show HN" adapter — авто-сабмит через HN API/форму.
 *
 * У HN нет официального API для сабмита, но есть Algolia API для поиска
 * и неофициальный endpoint submit. Используем Algolia search API для
 * проверки дублей, и помечаем как manual для реального постинга.
 */
const BaseSubmitAdapter = require('./base');

class HackerNewsAdapter extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const text = this.render(link.content_template || link.title, ctx);
    // 1. Проверяем, не было ли такого поста
    const query = text.split('\n')[0]?.replace(/^Title:\s*/i, '').slice(0, 60);
    const checkUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story`;
    const check = await this.httpGet(checkUrl);
    if (check.data?.hits?.length > 0) {
      const topHit = check.data.hits[0];
      return {
        ok: false,
        requiresManualReview: true,
        message: `Similar story exists: ${topHit.title}. Likely duplicate.`,
        externalUrl: topHit.url || `https://news.ycombinator.com/item?id=${topHit.objectID}`,
      };
    }
    // 2. Возвращаем dry-run для ручного сабмита
    return {
      ok: false,
      requiresManualReview: true,
      message: 'HN requires manual submit from https://news.ycombinator.com/submit (no public API)',
      payload: text,
      submissionUrl: 'https://news.ycombinator.com/submit',
    };
  }
}

module.exports = HackerNewsAdapter;
/**
 * Press-feed.ru adapter — автопубликация пресс-релизов.
 *
 * Требования:
 * - PRESS_FEED_API_KEY
 * - PRESS_FEED_CONTACT_EMAIL (для подписи пресс-релиза)
 *
 * Документация: https://press-feed.ru/api
 */
const BaseSubmitAdapter = require('./base');

class PressFeedAdapter extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const apiKey = process.env.PRESS_FEED_API_KEY?.trim();
    if (!apiKey) {
      return { ok: false, error: 'PRESS_FEED_API_KEY not configured' };
    }
    const text = this.render(link.content_template || link.title, ctx);
    const lines = text.split('\n');
    const headline = lines[0]?.replace(/^Заголовок:\s*/i, '').slice(0, 200) || link.title;
    const body = lines.slice(1).join('\n').trim();

    const res = await this.httpPost('https://press-feed.ru/api/v1/releases', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        headline,
        body,
        contact_email: ctx.contactEmail || process.env.PRESS_FEED_CONTACT_EMAIL,
        tags: link.tags || [],
        category: 'IT/Стартапы',
      }),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: JSON.stringify(res.data).slice(0, 300) };
    }
    return {
      ok: true,
      externalUrl: res.data?.url || 'https://press-feed.ru/',
      message: 'release submitted',
    };
  }
}

module.exports = PressFeedAdapter;
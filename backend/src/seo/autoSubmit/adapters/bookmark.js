/**
 * Универсальный адаптер для bookmark-сервисов: Pocket, Raindrop, Diigo, Delicious, Mix.
 *
 * Каждый сервис имеет свою аутентификацию и endpoint, но логика одинакова:
 * сохранить URL в коллекцию Woner.
 */
const BaseSubmitAdapter = require('./base');

class BookmarkAdapter extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const platform = link.platform; // 'bookmark'
    const key = link.link_key || '';
    let adapter;

    if (key.includes('pocket')) adapter = new PocketBookmark();
    else if (key.includes('raindrop')) adapter = new RaindropBookmark();
    else if (key.includes('diigo')) adapter = new DiigoBookmark();
    else if (key.includes('delicious')) adapter = new DeliciousBookmark();
    else if (key.includes('mix')) adapter = new MixBookmark();
    else return { ok: false, error: 'unknown bookmark adapter' };

    return adapter.submit(link, ctx);
  }
}

class PocketBookmark extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const token = process.env.POCKET_ACCESS_TOKEN?.trim();
    if (!token) return { ok: false, error: 'POCKET_ACCESS_TOKEN not configured' };
    const res = await this.httpPost('https://getpocket.com/v3/add', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Accept': 'application/json',
      },
      form: new URLSearchParams({
        url: ctx.trackedUrl,
        title: link.title,
        consumer_key: process.env.POCKET_CONSUMER_KEY || token,
        access_token: token,
      }).toString(),
    });
    return {
      ok: res.ok || res.status === 200,
      externalUrl: res.data?.url || ctx.trackedUrl,
      message: 'saved to pocket',
    };
  }
}

class RaindropBookmark extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const token = process.env.RAINDROP_TOKEN?.trim();
    if (!token) return { ok: false, error: 'RAINDROP_TOKEN not configured' };
    // Сначала создать/найти коллекцию
    const colRes = await this.httpPost('https://api.raindrop.io/rest/v1/raindrops', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        link: ctx.trackedUrl,
        title: link.title,
        tags: link.tags || ['woner'],
        collection: { $id: 0 }, // 0 = default
      }),
    });
    return {
      ok: colRes.ok,
      externalUrl: colRes.data?.url || ctx.trackedUrl,
      message: 'saved to raindrop',
    };
  }
}

class DiigoBookmark extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const apiKey = process.env.DIIGO_API_KEY?.trim();
    const user = process.env.DIIGO_USER?.trim();
    if (!apiKey || !user) return { ok: false, error: 'DIIGO_API_KEY/DIIGO_USER not configured' };
    const res = await this.httpPost('https://secure.diigo.com/api/v2/bookmarks', {
      form: new URLSearchParams({
        key: apiKey,
        user,
        url: ctx.trackedUrl,
        title: link.title,
        desc: link.anchor_text || '',
        tags: (link.tags || []).join(','),
      }).toString(),
    });
    return {
      ok: res.ok,
      externalUrl: ctx.trackedUrl,
      message: 'saved to diigo',
    };
  }
}

class DeliciousBookmark extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const user = process.env.DELICIOUS_USER?.trim();
    const pass = process.env.DELICIOUS_PASSWORD?.trim();
    if (!user || !pass) return { ok: false, error: 'DELICIOUS_USER/PASSWORD not configured' };
    const auth = Buffer.from(`${user}:${pass}`).toString('base64');
    const res = await this.httpPost('https://api.delicious.com/v1/posts/add', {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      form: new URLSearchParams({
        url: ctx.trackedUrl,
        description: link.title,
        extended: link.anchor_text || '',
        tags: (link.tags || []).join(' '),
      }).toString(),
    });
    return {
      ok: res.ok || res.data?.result_code === 'done',
      externalUrl: ctx.trackedUrl,
      message: 'saved to delicious',
    };
  }
}

class MixBookmark extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const token = process.env.MIX_TOKEN?.trim();
    if (!token) return { ok: false, error: 'MIX_TOKEN not configured' };
    const res = await this.httpPost('https://api.mix.com/v1/bookmarks', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({ url: ctx.trackedUrl, title: link.title }),
    });
    return {
      ok: res.ok,
      externalUrl: ctx.trackedUrl,
      message: 'saved to mix',
    };
  }
}

module.exports = BookmarkAdapter;
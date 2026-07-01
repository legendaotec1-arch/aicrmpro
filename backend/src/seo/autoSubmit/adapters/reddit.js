/**
 * Reddit API adapter — автопост в subreddit.
 *
 * Требования:
 * - REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD
 *   или REDDIT_OAUTH_TOKEN
 * - Subreddit должен быть в target_path (например, 'SaaS' для r/SaaS)
 */
const BaseSubmitAdapter = require('./base');

class RedditAdapter extends BaseSubmitAdapter {
  constructor() {
    super({ platform: 'reddit' });
    this.accessToken = null;
  }

  async authenticate() {
    const token = process.env.REDDIT_OAUTH_TOKEN?.trim();
    if (token) {
      this.accessToken = token;
      return true;
    }
    const clientId = process.env.REDDIT_CLIENT_ID?.trim();
    const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();
    const user = process.env.REDDIT_USERNAME?.trim();
    const pass = process.env.REDDIT_PASSWORD?.trim();
    if (!clientId || !clientSecret || !user || !pass) return false;

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await this.httpPost('https://www.reddit.com/api/v1/access_token', {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      form: new URLSearchParams({
        grant_type: 'password',
        username: user,
        password: pass,
      }).toString(),
    });
    if (res.ok && res.data?.access_token) {
      this.accessToken = res.data.access_token;
      return true;
    }
    return false;
  }

  extractSubreddit(link) {
    // Из instructions достаём r/SaaS, или из link_key типа 'reddit-r-saas'
    const m = (link.instructions || '').match(/r\/([A-Za-z0-9_]+)/);
    if (m) return m[1];
    const m2 = (link.link_key || '').match(/reddit-r-([a-z0-9-]+)/i);
    if (m2) return m2[1].replace(/-/g, '_');
    return 'SaaS';
  }

  async submit(link, ctx) {
    if (!await this.authenticate()) {
      return { ok: false, error: 'Reddit auth not configured (REDDIT_OAUTH_TOKEN or REDDIT_CLIENT_ID/SECRET/USERNAME/PASSWORD required)' };
    }
    const subreddit = this.extractSubreddit(link);
    const text = this.render(link.content_template, ctx);
    // Первый абзац — заголовок, остальное — текст
    const lines = text.split('\n').filter(Boolean);
    const title = lines[0]?.replace(/^Title:\s*/i, '').slice(0, 300) || 'Woner.ru';
    const body = lines.slice(1).join('\n').trim();

    const res = await this.httpPost('https://oauth.reddit.com/api/submit', {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'WonerBot/1.0 (by /u/woner_official)',
      },
      form: new URLSearchParams({
        sr: subreddit,
        kind: 'self',
        title,
        text: body,
        resubmit: 'true',
        api_type: 'json',
      }).toString(),
    });

    if (!res.ok) {
      return { ok: false, status: res.status, error: JSON.stringify(res.data).slice(0, 300) };
    }
    const json = res.data?.json || {};
    const errors = json.errors || [];
    if (errors.length) {
      return { ok: false, status: 0, error: errors.map((e) => e[1] || e[0]).join('; ') };
    }
    const postUrl = json.data?.url || json.data?.permalink;
    return {
      ok: true,
      externalUrl: postUrl ? `https://reddit.com${postUrl}` : `https://reddit.com/r/${subreddit}`,
      message: `posted to r/${subreddit}`,
    };
  }
}

module.exports = RedditAdapter;
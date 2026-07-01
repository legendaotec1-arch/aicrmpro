/**
 * Универсальный адаптер для соцсетей.
 *
 * Каждая соцсеть имеет свою аутентификацию:
 * - Medium: MEDIUM_INTEGRATION_TOKEN
 * - LinkedIn: LINKEDIN_ACCESS_TOKEN
 * - Twitter: TWITTER_BEARER_TOKEN
 * - Pinterest: PINTEREST_ACCESS_TOKEN
 * - Tumblr: TUMBLR_CONSUMER_KEY + TUMBLR_CONSUMER_SECRET + TUMBLR_OAUTH_TOKEN
 * - Mastodon: MASTODON_ACCESS_TOKEN
 * - Threads: THREADS_ACCESS_TOKEN + THREADS_USER_ID
 * - Bluesky: BLUESKY_HANDLE + BLUESKY_APP_PASSWORD
 */
const BaseSubmitAdapter = require('./base');

class SocialAdapter extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const platform = link.platform;
    const key = link.link_key || '';
    if (key.includes('medium')) return this.medium(link, ctx);
    if (key.includes('linkedin')) return this.linkedin(link, ctx);
    if (key.includes('twitter')) return this.twitter(link, ctx);
    if (key.includes('pinterest')) return this.pinterest(link, ctx);
    if (key.includes('tumblr')) return this.tumblr(link, ctx);
    if (key.includes('mastodon')) return this.mastodon(link, ctx);
    if (key.includes('threads')) return this.threads(link, ctx);
    if (key.includes('bluesky')) return this.bluesky(link, ctx);
    return { ok: false, error: 'unknown social adapter' };
  }

  async medium(link, ctx) {
    const token = process.env.MEDIUM_INTEGRATION_TOKEN?.trim();
    if (!token) return { ok: false, error: 'MEDIUM_INTEGRATION_TOKEN not configured' };
    const userRes = await this.httpGet('https://api.medium.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) return { ok: false, error: 'medium auth failed' };
    const userId = userRes.data?.data?.id;
    const text = this.render(link.content_template || link.title, ctx);
    const res = await this.httpPost(`https://api.medium.com/v1/users/${userId}/posts`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: JSON.stringify({
        title: link.title,
        contentFormat: 'markdown',
        content: text,
        publishStatus: 'public',
        canonicalUrl: ctx.trackedUrl,
      }),
    });
    return {
      ok: res.ok,
      externalUrl: res.data?.data?.url || '',
      message: 'posted to medium',
    };
  }

  async linkedin(link, ctx) {
    const token = process.env.LINKEDIN_ACCESS_TOKEN?.trim();
    const authorUrn = process.env.LINKEDIN_AUTHOR_URN?.trim();
    if (!token || !authorUrn) return { ok: false, error: 'LINKEDIN_ACCESS_TOKEN or LINKEDIN_AUTHOR_URN not configured' };
    const text = this.render(link.content_template || link.title, ctx);
    const res = await this.httpPost('https://api.linkedin.com/v2/ugcPosts', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'ARTICLE',
            media: [{
              status: 'READY',
              originalUrl: ctx.trackedUrl,
              title: { text: link.title },
            }],
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    return { ok: res.ok, externalUrl: ctx.trackedUrl, message: 'posted to linkedin' };
  }

  async twitter(link, ctx) {
    const token = process.env.TWITTER_BEARER_TOKEN?.trim();
    if (!token) return { ok: false, error: 'TWITTER_BEARER_TOKEN not configured' };
    const text = this.render((link.content_template || link.title) + '\n\n{{tracked_url}}', ctx).slice(0, 280);
    const res = await this.httpPost('https://api.twitter.com/2/tweets', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: JSON.stringify({ text }),
    });
    return { ok: res.ok, externalUrl: res.data?.data?.id ? `https://twitter.com/i/web/status/${res.data.data.id}` : '', message: 'posted to twitter' };
  }

  async pinterest(link, ctx) {
    const token = process.env.PINTEREST_ACCESS_TOKEN?.trim();
    if (!token) return { ok: false, error: 'PINTEREST_ACCESS_TOKEN not configured' };
    const res = await this.httpPost('https://api.pinterest.com/v5/pins', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: JSON.stringify({
        link: ctx.trackedUrl,
        title: link.title,
        description: link.anchor_text || '',
        board_id: process.env.PINTEREST_BOARD_ID,
      }),
    });
    return { ok: res.ok, externalUrl: ctx.trackedUrl, message: 'posted to pinterest' };
  }

  async tumblr(link, ctx) {
    const token = process.env.TUMBLR_OAUTH_TOKEN?.trim();
    if (!token) return { ok: false, error: 'TUMBLR_OAUTH_TOKEN not configured' };
    const res = await this.httpPost('https://api.tumblr.com/v2/blog/woner.tumblr.com/post', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: JSON.stringify({
        type: 'link',
        title: link.title,
        url: ctx.trackedUrl,
        description: link.anchor_text || '',
      }),
    });
    return { ok: res.ok, externalUrl: ctx.trackedUrl, message: 'posted to tumblr' };
  }

  async mastodon(link, ctx) {
    const token = process.env.MASTODON_ACCESS_TOKEN?.trim();
    const instance = process.env.MASTODON_INSTANCE?.trim() || 'mastodon.social';
    if (!token) return { ok: false, error: 'MASTODON_ACCESS_TOKEN not configured' };
    const text = this.render((link.content_template || link.title) + '\n\n{{tracked_url}}', ctx);
    const res = await this.httpPost(`https://${instance}/api/v1/statuses`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: JSON.stringify({ status: text.slice(0, 500) }),
    });
    return { ok: res.ok, externalUrl: res.data?.url || '', message: 'posted to mastodon' };
  }

  async threads(link, ctx) {
    const token = process.env.THREADS_ACCESS_TOKEN?.trim();
    const userId = process.env.THREADS_USER_ID?.trim();
    if (!token || !userId) return { ok: false, error: 'THREADS_ACCESS_TOKEN or THREADS_USER_ID not configured' };
    const text = this.render(link.content_template || link.title, ctx).slice(0, 500);
    // Сначала создаём контейнер
    const create = await this.httpPost(`https://graph.threads.net/v1.0/${userId}/threads`, {
      headers: { 'Content-Type': 'application/json' },
      form: new URLSearchParams({
        media_type: 'TEXT',
        text,
        access_token: token,
      }).toString(),
    });
    if (!create.ok) return { ok: false, error: JSON.stringify(create.data).slice(0, 300) };
    const creationId = create.data?.id;
    // Публикуем
    const publish = await this.httpPost(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
      form: new URLSearchParams({ creation_id: creationId, access_token: token }).toString(),
    });
    return { ok: publish.ok, externalUrl: '', message: 'posted to threads' };
  }

  async bluesky(link, ctx) {
    const handle = process.env.BLUESKY_HANDLE?.trim();
    const password = process.env.BLUESKY_APP_PASSWORD?.trim();
    if (!handle || !password) return { ok: false, error: 'BLUESKY_HANDLE or BLUESKY_APP_PASSWORD not configured' };
    // Authenticate
    const auth = await this.httpPost('https://bsky.social/xrpc/com.atproto.server.createSession', {
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ identifier: handle, password }),
    });
    if (!auth.ok) return { ok: false, error: 'bluesky auth failed' };
    const token = auth.data?.accessJwt;
    const did = auth.data?.did;
    const text = this.render((link.content_template || link.title) + '\n\n{{tracked_url}}', ctx).slice(0, 300);
    const res = await this.httpPost('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: JSON.stringify({
        repo: did,
        collection: 'app.bsky.feed.post',
        record: {
          text,
          createdAt: new Date().toISOString(),
        },
      }),
    });
    const uri = res.data?.uri;
    const rkey = uri?.split('/').pop();
    return { ok: res.ok, externalUrl: rkey ? `https://bsky.app/profile/${handle}/post/${rkey}` : '', message: 'posted to bluesky' };
  }
}

module.exports = SocialAdapter;
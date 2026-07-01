/**
 * VK API adapter — пост в публичную страницу/группу.
 *
 * Требования:
 * - VK_ACCESS_TOKEN (с правами wall.post на нужный паблик)
 * - VK_OWNER_ID (например, -123456 для группы)
 */
const BaseSubmitAdapter = require('./base');

class VkAdapter extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const token = process.env.VK_ACCESS_TOKEN?.trim();
    const ownerId = process.env.VK_OWNER_ID?.trim();
    if (!token || !ownerId) {
      return { ok: false, error: 'VK_ACCESS_TOKEN or VK_OWNER_ID not configured' };
    }
    const text = this.render(link.content_template || link.title, ctx);
    const res = await this.httpGet('https://api.vk.com/method/wall.post', {
      headers: {
        // VK принимает GET с параметрами
      },
    });
    // VK требует GET с query-параметрами, используем прямой URL
    const url = new URL('https://api.vk.com/method/wall.post');
    url.searchParams.set('owner_id', ownerId);
    url.searchParams.set('from_group', '1');
    url.searchParams.set('message', text.slice(0, 4096));
    url.searchParams.set('access_token', token);
    url.searchParams.set('v', '5.199');
    const post = await this.httpGet(url.toString());
    if (!post.ok || post.data?.error) {
      return { ok: false, error: JSON.stringify(post.data?.error || post.data).slice(0, 300) };
    }
    const postId = post.data?.response?.post_id;
    return {
      ok: true,
      externalUrl: `https://vk.com/wall${ownerId}_${postId}`,
      message: 'posted to vk',
    };
  }
}

module.exports = VkAdapter;
/**
 * Telegram Bot API adapter — пост в канал через бота.
 *
 * Требования:
 * - TELEGRAM_BOT_TOKEN (от @BotFather)
 * - TELEGRAM_CHANNEL_ID (например, @woner_official или -100...)
 *
 * Бот должен быть админом канала.
 */
const BaseSubmitAdapter = require('./base');

class TelegramAdapter extends BaseSubmitAdapter {
  async submit(link, ctx) {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const channel = process.env.TELEGRAM_CHANNEL_ID?.trim();
    if (!token || !channel) {
      return { ok: false, error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not configured' };
    }
    const text = this.render(link.content_template || link.title, ctx);
    const res = await this.httpPost(`https://api.telegram.org/bot${token}/sendMessage`, {
      form: new URLSearchParams({
        chat_id: channel,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: 'false',
      }).toString(),
    });
    if (!res.ok || !res.data?.ok) {
      return { ok: false, error: JSON.stringify(res.data).slice(0, 300) };
    }
    const msgId = res.data.result?.message_id;
    return {
      ok: true,
      externalUrl: `https://t.me/${String(channel).replace('@', '')}/${msgId}`,
      message: 'posted to telegram channel',
    };
  }
}

module.exports = TelegramAdapter;
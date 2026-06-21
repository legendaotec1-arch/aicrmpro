const db = require('../config/database');
const { sendMessengerNotification } = require('./notify');
const { getPublicUrl } = require('./links');

async function notifySalonOwner(salonId, text, { kind = 'chat', replyUrl, replyText } = {}) {
  const result = await db.query(
    `SELECT notify_telegram_user_id, notify_max_user_id,
            chat_notify_enabled, review_notify_enabled
     FROM masters WHERE id = $1`,
    [salonId]
  );
  const salon = result.rows[0];
  if (!salon) return false;

  if (kind === 'chat' && salon.chat_notify_enabled === false) return false;
  if (kind === 'review' && salon.review_notify_enabled === false) return false;

  const owner = {
    messenger: salon.notify_telegram_user_id ? 'telegram' : 'max',
    telegram_user_id: salon.notify_telegram_user_id || null,
    max_user_id: salon.notify_max_user_id || null
  };

  if (!owner.telegram_user_id && !owner.max_user_id) return false;

  if (owner.telegram_user_id) {
    owner.messenger = 'telegram';
  } else {
    owner.messenger = 'max';
  }

  return sendMessengerNotification(owner, text, { replyUrl, replyText });
}

function dashboardUrl() {
  return `${getPublicUrl()}/dashboard`;
}

async function notifyOwnerNewChatMessage(salonId, { clientName, body }) {
  const preview = body.length > 200 ? `${body.slice(0, 200)}…` : body;
  const link = `${dashboardUrl()}?section=chat`;
  const text =
    `💬 Новое сообщение в чате\n\n` +
    `👤 ${clientName || 'Клиент'}\n` +
    `${preview}\n\n` +
    `Откройте кабинет: ${link}`;
  return notifySalonOwner(salonId, text, {
    kind: 'chat',
    replyUrl: link,
    replyText: 'Открыть чат'
  });
}

async function notifyOwnerNewReview(salonId, { clientName, rating, body }) {
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  const link = dashboardUrl();
  const text =
    `⭐ Новый отзыв (на модерации)\n\n` +
    `👤 ${clientName || 'Клиент'} · ${stars}\n` +
    (body ? `${body.slice(0, 300)}\n\n` : '\n') +
    `Опубликовать в кабинете: ${link}`;
  return notifySalonOwner(salonId, text, { kind: 'review' });
}

module.exports = {
  notifySalonOwner,
  notifyOwnerNewChatMessage,
  notifyOwnerNewReview
};

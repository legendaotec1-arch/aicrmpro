const { displayPhone, normalizeRuPhoneForStorage } = require('./phoneRu');
const { resolveTelegramChatUrl } = require('./messengerLinks');

function buildClientPhoneFields(row) {
  const raw = row.profile_phone || row.phone || row.client_phone || null;
  const normalized = normalizeRuPhoneForStorage(raw);
  const phoneDisplay = displayPhone(raw);
  return {
    phone: normalized || raw,
    phone_display: phoneDisplay || raw,
    tel_href: normalized ? `tel:${normalized}` : null,
    phone_complete: !!phoneDisplay
  };
}

function buildClientChannelFields(row) {
  return {
    has_telegram: !!row.telegram_user_id,
    has_max: !!row.max_user_id,
    telegram_user_id: row.telegram_user_id || null,
    max_user_id: row.max_user_id || null,
    telegram_username: row.telegram_username || null,
    can_message: !!(row.telegram_user_id || row.max_user_id)
  };
}

async function buildClientContactInfo(row, { withTelegramUrl = false } = {}) {
  const phoneFields = buildClientPhoneFields(row);
  const channelFields = buildClientChannelFields(row);
  let telegram_url = null;
  if (withTelegramUrl && row.telegram_user_id) {
    telegram_url = await resolveTelegramChatUrl({
      telegramUserId: row.telegram_user_id,
      telegramUsername: row.telegram_username
    });
  }
  return {
    ...phoneFields,
    ...channelFields,
    telegram_url
  };
}

module.exports = {
  buildClientPhoneFields,
  buildClientChannelFields,
  buildClientContactInfo
};

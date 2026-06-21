const { buildMasterLinks } = require('./links');

const DEFAULT_MESSAGE =
  'Здравствуйте, {client_name}! Давно не виделись — будем рады снова видеть вас в {salon_name}. Записаться: {booking_link}';

function renderInviteMessage(template, { clientName, salonName, bookingLink }) {
  const text = template || DEFAULT_MESSAGE;
  return text
    .replace(/\{client_name\}/g, clientName || 'друг')
    .replace(/\{salon_name\}/g, salonName || 'наш салон')
    .replace(/\{booking_link\}/g, bookingLink);
}

function getSalonInviteSettings(row) {
  return {
    enabled: row.repeat_invite_enabled === true,
    days_after: row.repeat_invite_days || 30,
    message: row.repeat_invite_message || DEFAULT_MESSAGE
  };
}

function buildBookingLink(salonId) {
  const { clientUrl } = buildMasterLinks(salonId);
  return clientUrl;
}

module.exports = {
  DEFAULT_MESSAGE,
  renderInviteMessage,
  getSalonInviteSettings,
  buildBookingLink
};

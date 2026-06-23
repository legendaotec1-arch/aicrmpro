const db = require('../config/database');
const { buildMasterLinks } = require('./links');
const { assignUniqueSlug } = require('../seo/masterSeo');

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

function buildBookingLink(salonId, publicSlug = null) {
  const { clientUrl } = buildMasterLinks(salonId, publicSlug ? { publicSlug } : {});
  return clientUrl;
}

async function resolveBookingLink(salonId, dbConn = db) {
  const res = await dbConn.query(
    `SELECT id, name, last_name, salon_name, address, city, public_slug
     FROM masters WHERE id = $1`,
    [salonId]
  );
  const row = res.rows[0];
  if (!row) return buildBookingLink(salonId);
  const publicSlug = row.public_slug || await assignUniqueSlug(dbConn, row);
  return buildBookingLink(salonId, publicSlug);
}

module.exports = {
  DEFAULT_MESSAGE,
  renderInviteMessage,
  getSalonInviteSettings,
  buildBookingLink,
  resolveBookingLink,
};

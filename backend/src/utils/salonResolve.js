const { resolveMasterId, isResolvedMasterId } = require('./links');
const { resolveMasterIdFromParam } = require('../seo/masterSeo');

/** UUID салона из slug, base64 или uuid */
async function resolveSalonId(input) {
  if (!input) return null;
  if (isResolvedMasterId(input)) return input;
  const fromParam = await resolveMasterIdFromParam(input);
  if (fromParam) return fromParam;
  const decoded = resolveMasterId(input);
  return isResolvedMasterId(decoded) ? decoded : null;
}

module.exports = { resolveSalonId };

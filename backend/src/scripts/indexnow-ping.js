/**
 * Ручной пинок IndexNow со всеми обновлёнными URL за последние 7 дней.
 */
require('dotenv').config();
const db = require('../config/database');
const {
  notifyIndexNow,
  getSitemapUrlsForIndexNow,
  getRecentlyUpdatedPageUrls,
  getRecentlyPublishedArticleUrls,
} = require('../seo/indexNow');

(async () => {
  const urls = [
    ...(await getRecentlyUpdatedPageUrls(db, 24 * 7)),
    ...(await getRecentlyPublishedArticleUrls(db, 24 * 7)),
  ];
  const unique = [...new Set(urls)];
  console.log(`Pinging ${unique.length} URLs...`);
  const result = await notifyIndexNow(unique, { logPrefix: '[indexnow] regen-after-fix' });
  console.log(JSON.stringify(result, null, 2));
  await db.end();
  process.exit(0);
})().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
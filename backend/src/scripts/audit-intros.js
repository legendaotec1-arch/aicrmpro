require('dotenv').config();
const db = require('../config/database');
(async () => {
  const r = await db.query(`SELECT COUNT(*)::int AS c FROM seo_pages WHERE published = TRUE AND LENGTH(intro) < 300`);
  console.log('still thin (<300):', r.rows[0].c);
  const d = await db.query(`SELECT
    CASE WHEN LENGTH(intro) < 100 THEN '<100'
         WHEN LENGTH(intro) < 200 THEN '100-199'
         WHEN LENGTH(intro) < 300 THEN '200-299'
         WHEN LENGTH(intro) < 400 THEN '300-399'
         WHEN LENGTH(intro) < 500 THEN '400-499'
         ELSE '500+' END AS bucket, COUNT(*)::int AS c
    FROM seo_pages WHERE published = TRUE GROUP BY 1 ORDER BY 1`);
  console.log('intro length distribution:');
  d.rows.forEach((row) => console.log(' ', row.bucket, '|', row.c));
  await db.end();
})();
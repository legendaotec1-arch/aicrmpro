/**
 * Одноразовый сидинг geo-страниц (45 ниш x 50 городов = 2250 URL).
 * Безопасен для повторного запуска: использует INSERT ... ON CONFLICT DO NOTHING
 * и НЕ трогает существующие published-записи.
 *
 * Запуск (из backend-контейнера, чтобы был доступ к БД и переменным):
 *   docker exec crm_max_backend node src/scripts/seed-geo-pages.js
 *
 * Или из репо (нужны env + доступ к postgres):
 *   cd backend && node src/scripts/seed-geo-pages.js
 */
require('dotenv').config();
const db = require('../config/database');
const { generateGeoPages } = require('../seo/geoMatrix');

async function ensureExtrasColumn() {
  // extras уже есть, но проверим — на случай если миграции где-то не накатились
  await db.query(
    `ALTER TABLE seo_pages ADD COLUMN IF NOT EXISTS extras JSONB NOT NULL DEFAULT '{}'`
  );
}

async function getExistingGeoSlugs() {
  const r = await db.query(
    `SELECT slug FROM seo_pages WHERE extras->>'geoGenerated' = 'true'`
  );
  return new Set(r.rows.map((row) => row.slug));
}

async function upsertGeoPage(page) {
  await db.query(
    `INSERT INTO seo_pages (
       slug, page_type, cluster, niche, title, meta_description, h1, intro,
       sections, faq, related_slugs, priority, published, toc, extras
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (slug) DO UPDATE SET
       page_type = EXCLUDED.page_type,
       cluster = EXCLUDED.cluster,
       niche = EXCLUDED.niche,
       title = EXCLUDED.title,
       meta_description = EXCLUDED.meta_description,
       h1 = EXCLUDED.h1,
       intro = EXCLUDED.intro,
       sections = EXCLUDED.sections,
       faq = EXCLUDED.faq,
       related_slugs = EXCLUDED.related_slugs,
       priority = EXCLUDED.priority,
       published = EXCLUDED.published,
       toc = EXCLUDED.toc,
       extras = EXCLUDED.extras,
       updated_at = NOW()`,
    [
      page.slug,
      page.page_type,
      page.cluster,
      page.niche || null,
      page.title,
      page.meta_description,
      page.h1,
      page.intro,
      JSON.stringify(page.sections),
      JSON.stringify(page.faq),
      page.related_slugs || [],
      page.priority,
      page.published ?? true,
      JSON.stringify(page.toc || []),
      JSON.stringify(page.extras || {}),
    ]
  );
}

async function main() {
  console.log('[geo-seed] ensuring extras column…');
  await ensureExtrasColumn();

  console.log('[geo-seed] collecting already-published geo slugs…');
  const existing = await getExistingGeoSlugs();
  console.log(`[geo-seed] already in DB: ${existing.size}`);

  console.log('[geo-seed] generating geo pages…');
  const pages = generateGeoPages();
  const toInsert = pages.filter((p) => !existing.has(p.slug));
  console.log(`[geo-seed] generated: ${pages.length}, to insert: ${toInsert.length}`);

  if (toInsert.length === 0) {
    console.log('[geo-seed] nothing to insert. Done.');
    await db.end();
    return;
  }

  const client = await db.connect();
  let inserted = 0;
  let errors = 0;
  try {
    await client.query('BEGIN');
    for (const page of toInsert) {
      try {
        await upsertGeoPage(page);
        inserted += 1;
        if (inserted % 100 === 0) {
          console.log(`[geo-seed] inserted ${inserted}/${toInsert.length}`);
        }
      } catch (err) {
        errors += 1;
        console.error(`[geo-seed] failed ${page.slug}:`, err.message);
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`[geo-seed] DONE. inserted=${inserted}, errors=${errors}, total=${pages.length}`);
  await db.end();
}

main().catch((err) => {
  console.error('[geo-seed] FATAL', err);
  process.exit(1);
});

/**
 * Перегенерировать meta_description для всех seo_pages и seo_articles
 * с учётом расширенного META_TEMPLATES.
 * Использует ту же функцию generateUniqueMeta, что и seed.
 *
 * Использование: docker exec crm_max_backend node /app/src/scripts/regenerate-meta-descriptions.js
 */
require('dotenv').config();
const db = require('../config/database');
const { generateUniqueMeta } = require('../seo/uniqueContent');
const { NICHE_CATALOG } = require('../seo/niches');
const { CITY_CATALOG } = require('../seo/cities');

const NICHE_BY_ID = new Map(NICHE_CATALOG.map((n) => [n.id, n]));
const CITY_BY_ID = new Map(CITY_CATALOG.map((c) => [c.id, c]));

function buildSlugContext(row) {
  // Подтягиваем genitive из каталога ниш по niche_id
  const niche = NICHE_BY_ID.get(row.niche);
  const genitive = niche?.genitive || 'мастеров услуг';

  // Определяем город для geo-страниц (extras.city хранит slugBase, не id)
  let city = null;
  const isGeo = row.extras?.geoGenerated === true || row.extras?.geoGenerated === 'true';
  if (isGeo && row.extras?.city) {
    const c = CITY_CATALOG.find((cc) => cc.slugBase === row.extras.city);
    if (c) {
      city = {
        id: c.id,
        name: c.name,
        prepositional: c.prepositional,
        genitive: c.genitive,
      };
    }
  }

  return {
    h1: row.h1,
    h1Lower: row.h1?.toLowerCase(),
    genitive,
    site: 'Woner.ru',
    pageType: row.page_type,
    variant: row.variant,
    category: niche?.category || 'beauty',
    city,
    nicheId: niche?.id,
  };
}

async function processPages(client) {
  // Берём все опубликованные страницы
  const r = await client.query(
    `SELECT slug, h1, page_type, niche, meta_description,
            extras
     FROM seo_pages
     WHERE published = TRUE`
  );
  let updated = 0;
  let unchanged = 0;
  const errors = [];
  for (const row of r.rows) {
    try {
      const ctx = buildSlugContext(row);
      const newMeta = generateUniqueMeta(row.slug, ctx);
      if (!newMeta) {
        unchanged += 1;
        continue;
      }
      if (newMeta !== row.meta_description) {
        await client.query(
          `UPDATE seo_pages SET meta_description = $2, updated_at = NOW() WHERE slug = $1`,
          [row.slug, newMeta]
        );
        updated += 1;
        if (updated % 200 === 0) {
          console.log(`[pages] progress: ${updated} updated / ${unchanged} unchanged`);
        }
      } else {
        unchanged += 1;
      }
    } catch (err) {
      errors.push(`${row.slug}: ${err.message}`);
    }
  }
  return { updated, unchanged, errors };
}

async function processArticles(client) {
  const r = await client.query(
    `SELECT slug, h1, category, meta_description FROM seo_articles WHERE published = TRUE`
  );
  let updated = 0;
  let unchanged = 0;
  for (const row of r.rows) {
    try {
      // Для статей берём genitive из slug (resolveNicheFromSlug логика)
      let genitive = 'мастеров услуг';
      for (const n of NICHE_CATALOG) {
        if (row.slug.includes(n.slugBase)) {
          genitive = n.genitive;
          break;
        }
      }
      const ctx = {
        h1: row.h1,
        h1Lower: row.h1?.toLowerCase(),
        genitive,
        site: 'Woner.ru',
        category: row.category,
      };
      const newMeta = generateUniqueMeta(row.slug, ctx);
      if (!newMeta) {
        unchanged += 1;
        continue;
      }
      if (newMeta !== row.meta_description) {
        await client.query(
          `UPDATE seo_articles SET meta_description = $2, updated_at = NOW() WHERE slug = $1`,
          [row.slug, newMeta]
        );
        updated += 1;
      } else {
        unchanged += 1;
      }
    } catch (err) {
      console.warn(`[articles] ${row.slug}: ${err.message}`);
    }
  }
  return { updated, unchanged };
}

async function main() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    console.log('[pages] regenerating…');
    const pagesResult = await processPages(client);
    console.log(`[pages] done: updated=${pagesResult.updated} unchanged=${pagesResult.unchanged} errors=${pagesResult.errors.length}`);
    if (pagesResult.errors.length) {
      console.log('first 5 errors:', pagesResult.errors.slice(0, 5).join(' | '));
    }
    console.log('[articles] regenerating…');
    const artResult = await processArticles(client);
    console.log(`[articles] done: updated=${artResult.updated} unchanged=${artResult.unchanged}`);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  await db.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});

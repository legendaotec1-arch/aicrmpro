/**
 * Перегенерировать intro для всех template-страниц с intro < 300 символов.
 * AI-страницы и manuallyEdited не трогаем.
 *
 * Использование: docker exec crm_max_backend node /app/src/scripts/regenerate-intros.js
 */
require('dotenv').config();
const db = require('../config/database');
const { generateUniqueIntro } = require('../seo/uniqueContent');
const { NICHE_CATALOG } = require('../seo/niches');
const { CITY_CATALOG } = require('../seo/cities');

const NICHE_BY_ID = new Map(NICHE_CATALOG.map((n) => [n.id, n]));

function buildCtx(row) {
  const niche = NICHE_BY_ID.get(row.niche);
  const genitive = niche?.genitive || 'мастеров услуг';
  let city = null;
  const isGeo = row.extras?.geoGenerated === true || row.extras?.geoGenerated === 'true';
  if (isGeo && row.extras?.city) {
    const c =
      CITY_CATALOG.find((cc) => cc.id === row.extras.city) ||
      CITY_CATALOG.find((cc) => cc.slugBase === row.extras.city);
    if (c) {
      city = { id: c.id, name: c.name, prepositional: c.prepositional, genitive: c.genitive };
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

async function main() {
  const client = await db.connect();
  let updated = 0;
  let skipped = 0;
  const errors = [];
  try {
    await client.query('BEGIN');
    // Берём только template-страницы, у которых intro короче 300 симв.
    // AI-страницы и manuallyEdited не трогаем.
    const r = await client.query(
      `SELECT slug, h1, page_type, niche, intro, extras
       FROM seo_pages
       WHERE published = TRUE
         AND content_source = 'template'
         AND (extras->>'manuallyEdited') IS DISTINCT FROM 'true'
         AND LENGTH(intro) < 300`
    );
    console.log(`[intro-regen] found ${r.rows.length} pages with short intro`);
    const crypto = require('crypto');
    const EXTRA_TAIL = [
      'Бесплатно попробуйте и оцените разницу в первый же день.',
      'Оставьте заявку — расскажем, как настроить под вашу нишу.',
      'Меньше рутины, больше записей и лояльных клиентов.',
      'Простое подключение без программистов и обучения персонала.',
      'Понятный интерфейс и поддержка 9–21 по Москве.',
      'Бот и календарь работают на телефоне и компьютере.',
      'Уведомления клиентам через Telegram и MAX.',
      'Записывайтесь на бесплатный тест-драйв сервиса сегодня.',
    ];
    for (const row of r.rows) {
      try {
        const ctx = buildCtx(row);
        let newIntro = generateUniqueIntro(row.slug, ctx);
        // Если шаблон оказался слишком короткий — добиваем ещё одним хвостом
        // по хешу, чтобы гарантированно пройти порог 300 символов.
        if (newIntro && newIntro.length < 300) {
          const h = crypto.createHash('sha256').update(`intro-fallback:${row.slug}`).digest();
          const tail = EXTRA_TAIL[h.readUInt16BE(0) % EXTRA_TAIL.length];
          newIntro = /[.!?]\s*$/.test(newIntro) ? `${newIntro} ${tail}` : `${newIntro}. ${tail}`;
        }
        if (newIntro && newIntro.length >= 300 && newIntro !== row.intro) {
          await client.query(
            `UPDATE seo_pages SET intro = $2, updated_at = NOW() WHERE slug = $1`,
            [row.slug, newIntro]
          );
          updated += 1;
          if (updated % 200 === 0) {
            console.log(`[intro-regen] progress: ${updated}/${r.rows.length}`);
          }
        } else {
          skipped += 1;
        }
      } catch (err) {
        errors.push(`${row.slug}: ${err.message}`);
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  console.log(`\nDONE. updated=${updated}, skipped=${skipped}, errors=${errors.length}`);
  if (errors.length) console.log('first 5 errors:', errors.slice(0, 5).join(' | '));
  await db.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});

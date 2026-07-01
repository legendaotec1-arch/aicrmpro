/**
 * Перегенерировать intro для всех template-статей с intro < 300 символов.
 * AI-статьи и manuallyEdited не трогаем.
 */
require('dotenv').config();
const db = require('../config/database');
const { generateArticleIntro } = require('../seo/uniqueContent');

async function main() {
  const client = await db.connect();
  let updated = 0;
  let skipped = 0;
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
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `SELECT slug, category, intro
       FROM seo_articles
       WHERE published = TRUE
         AND content_source = 'template'
         AND LENGTH(intro) < 300`
    );
    console.log(`[article-intro-regen] found ${r.rows.length} articles with short intro`);
    for (const row of r.rows) {
      try {
        let newIntro = generateArticleIntro(row.slug, { genitive: 'бизнеса', category: row.category || 'beauty' });
        if (newIntro && newIntro.length < 300) {
          const h = crypto.createHash('sha256').update(`art-intro-fallback:${row.slug}`).digest();
          const tail = EXTRA_TAIL[h.readUInt16BE(0) % EXTRA_TAIL.length];
          newIntro = /[.!?]\s*$/.test(newIntro) ? `${newIntro} ${tail}` : `${newIntro}. ${tail}`;
        }
        if (newIntro && newIntro.length >= 300 && newIntro !== row.intro) {
          await client.query(
            `UPDATE seo_articles SET intro = $2, updated_at = NOW() WHERE slug = $1`,
            [row.slug, newIntro]
          );
          updated += 1;
          if (updated % 200 === 0) {
            console.log(`[article-intro-regen] progress: ${updated}/${r.rows.length}`);
          }
        } else {
          skipped += 1;
        }
      } catch (err) {
        console.log('err', row.slug, err.message);
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  console.log(`\nDONE. updated=${updated}, skipped=${skipped}`);
  await db.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
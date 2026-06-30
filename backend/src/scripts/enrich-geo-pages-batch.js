/**
 * Фоновый AI-энайчмент geo-страниц: гоняет батчи по BATCH_SIZE страниц,
 * пока не закончатся. Безопасно прерывается по SIGTERM (закрытие фоновой задачи).
 *
 * Использование: docker exec crm_max_backend node /app/src/scripts/enrich-geo-pages-batch.js
 * Опции окружения:
 *   GEO_AI_BATCH_SIZE — сколько страниц за раз (по умолчанию 50)
 *   GEO_AI_MAX_BATCHES — сколько батчей подряд (по умолчанию без лимита)
 *   GEO_AI_PAUSE_MS — пауза между батчами в мс (по умолчанию 30s)
 *   OPENROUTER_REQUEST_DELAY_MS — задержка между страницами (по умолчанию 4s)
 */
require('dotenv').config();
const db = require('../config/database');
const { enrichUpcomingPages } = require('../seo/articleAiEnricher');

const BATCH_SIZE = Number(process.env.GEO_AI_BATCH_SIZE) || 50;
const MAX_BATCHES = Number(process.env.GEO_AI_MAX_BATCHES) || Infinity;
const PAUSE_MS = Number(process.env.GEO_AI_PAUSE_MS) || 30_000;

let stopRequested = false;
function handleSignal(sig) {
  console.log(`[geo-ai] received ${sig}, finishing current batch…`);
  stopRequested = true;
}
process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const startedAt = Date.now();
  let totalEnriched = 0;
  let totalFailed = 0;
  let batchIdx = 0;

  while (!stopRequested && batchIdx < MAX_BATCHES) {
    batchIdx += 1;
    const t = Date.now();
    console.log(`[geo-ai] === batch ${batchIdx} (size=${BATCH_SIZE}) ===`);
    let result;
    try {
      result = await enrichUpcomingPages(db, BATCH_SIZE, { geoOnly: true });
    } catch (err) {
      console.error(`[geo-ai] batch ${batchIdx} crashed:`, err.message);
      await sleep(PAUSE_MS);
      continue;
    }
    totalEnriched += result.enriched;
    totalFailed += result.failed;
    console.log(
      `[geo-ai] batch ${batchIdx} done in ${((Date.now() - t) / 1000).toFixed(1)}s:` +
      ` enriched=${result.enriched} failed=${result.failed}` +
      (result.errors?.length ? ` errors=${result.errors.slice(0, 3).join(' | ')}` : '')
    );

    if (result.enriched === 0 && result.failed === 0) {
      console.log('[geo-ai] queue empty, done.');
      break;
    }
    if (result.enriched < BATCH_SIZE) {
      console.log('[geo-ai] partial batch — likely queue exhausted, stopping.');
      break;
    }
    if (stopRequested) break;
    console.log(`[geo-ai] sleeping ${PAUSE_MS / 1000}s before next batch…`);
    await sleep(PAUSE_MS);
  }

  const elapsed = ((Date.now() - startedAt) / 1000 / 60).toFixed(1);
  console.log(`[geo-ai] ALL DONE in ${elapsed}min. enriched=${totalEnriched} failed=${totalFailed}`);
  await db.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('[geo-ai] FATAL', err);
  process.exit(1);
});

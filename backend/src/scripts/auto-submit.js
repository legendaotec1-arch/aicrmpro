#!/usr/bin/env node
/**
 * CLI для автосабмита внешних площадок.
 *
 * Использование:
 *   node scripts/auto-submit.js --preview                 # dry-run по всем запланированным
 *   node scripts/auto-submit.js --platform=reddit         # только Reddit
 *   node scripts/auto-submit.js --limit=10                # первые 10
 *   node scripts/auto-submit.js --link-key=reddit-r-saas # конкретная площадка
 *   node scripts/auto-submit.js --limit=20 --platform=telegram,vk,social
 */
require('dotenv').config();
const { runAutoSubmitBatch, submitLink, previewLink } = require('../seo/autoSubmit/orchestrator');
const db = require('../config/database');

function arg(name, def = null) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? m.split('=')[1] : def;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const isPreview = hasFlag('preview');
  const platform = arg('platform');
  const limit = parseInt(arg('limit', '5'), 10);
  const linkKey = arg('link-key');

  console.log('=== Auto-submit CLI ===');
  console.log('Mode:', isPreview ? 'PREVIEW' : 'SUBMIT');
  if (platform) console.log('Platform filter:', platform);
  console.log('Limit:', limit);
  if (linkKey) console.log('Specific link:', linkKey);

  try {
    if (linkKey) {
      const res = await db.query('SELECT * FROM seo_external_links WHERE link_key = $1', [linkKey]);
      if (!res.rows.length) {
        console.log('link not found:', linkKey);
        return process.exit(1);
      }
      const link = res.rows[0];
      if (isPreview) {
        const preview = await previewLink(link);
        console.log('Preview:', JSON.stringify(preview, null, 2));
      } else {
        const result = await submitLink(link);
        console.log('Result:', JSON.stringify(result, null, 2));
      }
    } else {
      const platforms = platform ? platform.split(',').map((p) => p.trim()) : null;
      const r = await runAutoSubmitBatch({ limit, platforms, dryRun: isPreview });
      console.log('---');
      console.log(`Processed: ${r.total}`);
      console.log(JSON.stringify(r.results, null, 2));
    }
  } catch (err) {
    console.error('FATAL:', err);
    process.exit(1);
  }
  await db.end();
  process.exit(0);
}

main();
#!/usr/bin/env node
/**
 * Одноразовое сжатие тяжёлых /uploads и обновление путей в БД.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { uploadsDir } = require('../config/paths');
const { optimizeImageFile, createThumbnail } = require('../utils/imageOptimize');

const MIN_SIZE = 200 * 1024;

async function updateUrlColumn(table, column, oldUrl, newUrl) {
  if (!oldUrl || !newUrl || oldUrl === newUrl) return 0;
  const res = await db.query(
    `UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`,
    [newUrl, oldUrl]
  );
  return res.rowCount || 0;
}

async function main() {
  const files = fs.readdirSync(uploadsDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  let optimized = 0;

  for (const file of files) {
    const abs = path.join(uploadsDir, file);
    const stat = fs.statSync(abs);
    if (stat.size < MIN_SIZE) continue;

    const oldUrl = `/uploads/${file}`;
    const newUrl = await optimizeImageFile(abs, { maxWidth: 1200, quality: 82, minBytes: 0 });
    if (!newUrl || newUrl === oldUrl) continue;

    optimized += 1;
    console.log(`${file} (${Math.round(stat.size / 1024)}KB) → ${newUrl}`);

    for (const [table, col] of [
      ['masters', 'logo_url'],
      ['salon_masters', 'photo_url'],
      ['portfolio', 'image_url'],
      ['price_items', 'image_url'],
    ]) {
      const n = await updateUrlColumn(table, col, oldUrl, newUrl);
      if (n) console.log(`  updated ${table}.${col}: ${n}`);
    }

    if (oldUrl.includes('/uploads/')) {
      const thumb = await createThumbnail(newUrl);
      if (thumb) {
        const n = await db.query(
          `UPDATE portfolio SET thumbnail_url = $1 WHERE image_url = $2 AND (thumbnail_url IS NULL OR thumbnail_url = '')`,
          [thumb, newUrl]
        );
        if (n.rowCount) console.log(`  thumbnail portfolio: ${thumb}`);
      }
    }
  }

  console.log(`Done. Optimized ${optimized} file(s).`);
  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { uploadsDir } = require('../config/paths');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function toUploadUrl(filename) {
  return `/uploads/${filename}`;
}

function absUploadPath(fileOrUrl) {
  const name = path.basename(String(fileOrUrl || '').replace(/^\/uploads\//, ''));
  return path.join(uploadsDir, name);
}

/**
 * Сжимает фото для веба (WebP). Возвращает относительный URL /uploads/...
 */
async function optimizeImageFile(filePath, { maxWidth = 1200, quality = 82, minBytes = 120 * 1024 } = {}) {
  const abs = absUploadPath(filePath);
  if (!fs.existsSync(abs)) return null;

  const stat = fs.statSync(abs);
  const ext = path.extname(abs).toLowerCase();
  if (!IMAGE_EXT.has(ext)) return toUploadUrl(path.basename(abs));
  if (stat.size < minBytes) return toUploadUrl(path.basename(abs));

  const base = path.basename(abs, ext);
  const outAbs = path.join(uploadsDir, `${base}.webp`);
  const tmpAbs = `${outAbs}.tmp`;

  await sharp(abs)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality })
    .toFile(tmpAbs);

  fs.renameSync(tmpAbs, outAbs);
  if (outAbs !== abs) {
    try { fs.unlinkSync(abs); } catch { /* ignore */ }
  }

  return toUploadUrl(path.basename(outAbs));
}

async function optimizeMulterImage(file, options = {}) {
  if (!file?.path) return null;
  return optimizeImageFile(file.path, options);
}

/** Миниатюра для сетки портфолио */
async function createThumbnail(imageUrl, { width = 480, quality = 75 } = {}) {
  const abs = absUploadPath(imageUrl);
  if (!fs.existsSync(abs)) return null;

  const base = path.basename(abs).replace(/\.[^.]+$/, '');
  const thumbAbs = path.join(uploadsDir, `${base}_thumb.webp`);
  await sharp(abs)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toFile(thumbAbs);

  return toUploadUrl(path.basename(thumbAbs));
}

module.exports = {
  optimizeImageFile,
  optimizeMulterImage,
  createThumbnail,
};

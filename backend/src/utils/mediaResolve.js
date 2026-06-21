const fs = require('fs');
const path = require('path');
const { uploadsDir } = require('../config/paths');

function resolveStoredUploadUrl(storedUrl) {
  if (!storedUrl || typeof storedUrl !== 'string') return null;
  const trimmed = storedUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const filename = path.basename(normalized);
  if (!filename) return null;

  try {
    if (fs.existsSync(path.join(uploadsDir, filename))) {
      return normalized.startsWith('/uploads/') ? normalized : `/uploads/${filename}`;
    }
  } catch {
    return null;
  }
  return null;
}

const resolveStoredPhotoUrl = resolveStoredUploadUrl;

function sanitizeSalonMasterRow(row) {
  if (!row) return row;
  return {
    ...row,
    photo_url: resolveStoredUploadUrl(row.photo_url)
  };
}

function sanitizeMasterMediaRow(row) {
  if (!row) return row;
  return {
    ...row,
    logo_url: resolveStoredUploadUrl(row.logo_url),
    video_reel_url: resolveStoredUploadUrl(row.video_reel_url)
  };
}

function sanitizePortfolioRow(row) {
  if (!row) return row;
  return {
    ...row,
    image_url: resolveStoredUploadUrl(row.image_url),
    video_url: resolveStoredUploadUrl(row.video_url),
    thumbnail_url: resolveStoredUploadUrl(row.thumbnail_url)
  };
}

module.exports = {
  resolveStoredUploadUrl,
  resolveStoredPhotoUrl,
  sanitizeSalonMasterRow,
  sanitizeMasterMediaRow,
  sanitizePortfolioRow
};

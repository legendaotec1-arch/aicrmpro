const path = require('path');

const NO_STORE = 'no-store, no-cache, must-revalidate';

function setStaticCacheHeaders(res, filePath) {
  const fileName = path.basename(filePath);
  const normalized = filePath.split(path.sep).join('/');

  if (
    fileName === 'index.html' ||
    fileName === 'sw.js' ||
    fileName.endsWith('.webmanifest') ||
    fileName === 'site.webmanifest'
  ) {
    res.setHeader('Cache-Control', NO_STORE);
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return;
  }

  if (normalized.includes('/assets/')) {
    const hashed = /\.[a-zA-Z0-9_-]{6,}\.(js|css|woff2?|map)$/.test(fileName);
    res.setHeader(
      'Cache-Control',
      hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=86400'
    );
  }
}

function sendSpaIndex(res, indexPath) {
  res.setHeader('Cache-Control', NO_STORE);
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(indexPath);
}

module.exports = { setStaticCacheHeaders, sendSpaIndex, NO_STORE };

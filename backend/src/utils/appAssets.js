const fs = require('fs');
const path = require('path');
const { frontendDist } = require('../config/paths');

let cached = null;
let cachedMtime = 0;

function readAppAssets() {
  const assetsDir = path.join(frontendDist, 'assets');
  let dirMtime = 0;
  try {
    dirMtime = fs.statSync(assetsDir).mtimeMs;
  } catch {
    return { js: null, css: null, build: Date.now().toString(36) };
  }

  if (cached && dirMtime === cachedMtime) return cached;

  let files = [];
  try {
    files = fs.readdirSync(assetsDir);
  } catch {
    return { js: null, css: null, build: Date.now().toString(36) };
  }

  const jsFile = files.find((f) => /^index-.*\.js$/.test(f));
  const cssFile = files.find((f) => /^(index|style)-.*\.css$/.test(f));
  cached = {
    js: jsFile ? `/assets/${jsFile}` : null,
    css: cssFile ? `/assets/${cssFile}` : null,
    build: Date.now().toString(36),
  };
  cachedMtime = dirMtime;
  return cached;
}

module.exports = { readAppAssets };

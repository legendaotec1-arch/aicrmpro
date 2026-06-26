#!/usr/bin/env bash
# Отдельная сборка booking (/m/*) — без dashboard, SEO, admin.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend-booking"

if [ ! -d node_modules ]; then
  echo "==> npm install (frontend-booking)"
  npm install
fi

echo "==> Build frontend-booking → dist/"
npm run build

DIST="$ROOT/frontend-booking/dist"
if [ ! -f "$DIST/index.html" ]; then
  echo "ERROR: frontend-booking/dist/index.html не создан"
  exit 1
fi

if command -v brotli >/dev/null 2>&1; then
  echo "==> Brotli precompress booking-assets/"
  find "$DIST/assets" -type f \( -name '*.js' -o -name '*.css' \) ! -name '*.br' -exec brotli -kf {} \;
fi

echo "==> Booking bundles:"
ls -la "$DIST/assets/"*.js 2>/dev/null | awk '{print $5, $9}'
for f in "$DIST/assets/"*.js; do
  [ -f "$f" ] || continue
  echo -n "  $(basename "$f") br: "
  wc -c < "${f}.br" 2>/dev/null || gzip -c "$f" | wc -c
done

echo ""
echo "Готово. nginx: /m/ → frontend-booking/dist, /booking-assets/ → dist/assets"

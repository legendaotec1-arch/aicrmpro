#!/usr/bin/env bash
# Боевой UI: nginx → crm_max_backend:3000 → volume ./frontend/dist (на диске, не в образе Docker)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Build frontend → frontend/dist/"
if [ -f "$ROOT/.env" ]; then
  # Vite подхватывает VITE_* только на этапе сборки
  while IFS= read -r line; do
    case "$line" in VITE_SENTRY_*=*) export "$line" ;; esac
  done < <(grep -E '^VITE_SENTRY_' "$ROOT/.env" 2>/dev/null || true)
fi
(cd frontend && npm run build)

if [ ! -f frontend/dist/index.html ]; then
  echo "ERROR: frontend/dist/index.html не создан"
  exit 1
fi

echo "==> Актуальные бандлы:"
grep -oE 'assets/index-[^"]+' frontend/dist/index.html || true

echo ""
echo "Backend читает эту папку через volume mount (перезапуск не нужен для смены UI)."
echo "Пересоздайте backend только после правок docker-compose:"
echo "  docker compose up -d backend"
echo "Done."

#!/bin/bash
# На сервере (консоль Beget): bash /opt/aicrmpro/deploy/patch-yandex-maps-env.sh ВАШ_КЛЮЧ
set -e
APP_DIR="/opt/aicrmpro"
KEY="${1:-}"
cd "$APP_DIR"

if [ -z "$KEY" ]; then
  echo "Usage: bash deploy/patch-yandex-maps-env.sh <YANDEX_MAPS_API_KEY>"
  exit 1
fi

if grep -q '^YANDEX_MAPS_API_KEY=' .env 2>/dev/null; then
  sed -i "s|^YANDEX_MAPS_API_KEY=.*|YANDEX_MAPS_API_KEY=$KEY|" .env
else
  echo "YANDEX_MAPS_API_KEY=$KEY" >> .env
fi

docker compose -f docker-compose.prod-external-ssl.yml up -d --force-recreate backend
sleep 4
curl -sf http://127.0.0.1:3000/api/config/public && echo ''

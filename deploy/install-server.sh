#!/bin/bash
# Запуск на сервере: bash /opt/aicrmpro/deploy/install-server.sh
set -e

APP_DIR="/opt/aicrmpro"
cd "$APP_DIR"

echo "==> MasterClient45 install @ $APP_DIR"

if ! command -v docker &>/dev/null; then
  echo "==> Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! docker compose version &>/dev/null; then
  echo "ERROR: docker compose not found"
  exit 1
fi

mkdir -p uploads deploy/certs

if [ ! -f .env ]; then
  if [ -f deploy/aicrmpro.env.example ]; then
    cp deploy/aicrmpro.env.example .env
    echo "==> Created .env from template — EDIT BEFORE PRODUCTION:"
    echo "    nano $APP_DIR/.env"
  else
    echo "ERROR: .env missing. Copy deploy/aicrmpro.env.example to .env"
    exit 1
  fi
fi

if grep -q 'ЗАМЕНИТЕ' .env 2>/dev/null; then
  echo "WARNING: .env still has placeholder values (ЗАМЕНИТЕ). Edit: nano $APP_DIR/.env"
fi

echo "==> Building and starting containers (SSL on domain, ports 3000/3001)..."
docker compose -f docker-compose.prod-external-ssl.yml build
docker compose -f docker-compose.prod-external-ssl.yml up -d

if [ -f deploy/apply-pending-migrations.sh ]; then
  bash deploy/apply-pending-migrations.sh || echo "WARNING: migrations failed — run: bash deploy/apply-pending-migrations.sh"
fi

echo ""
echo "==> Status:"
docker compose -f docker-compose.prod-external-ssl.yml ps

echo ""
echo "==> Health (local):"
sleep 3
curl -sf http://127.0.0.1:3000/api/health && echo "" || echo "Backend not ready yet — check: docker compose -f docker-compose.prod-external-ssl.yml logs backend"

# nginx + SSL для домена (если DNS уже на этом VPS)
if [ -f deploy/setup-nginx-on-vps.sh ]; then
  EMAIL=""
  DOMAIN="masterclient45.ru"
  if [ -f .env ]; then
    EMAIL=$(grep -E '^LETSENCRYPT_EMAIL=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")
    DOMAIN=$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d '"' | tr -d "'" || echo "$DOMAIN")
  fi
  if [ -n "$EMAIL" ] && [ ! -f "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    echo "==> Configuring nginx + SSL for $DOMAIN..."
    bash deploy/setup-nginx-on-vps.sh "$EMAIL" "$DOMAIN" || echo "WARNING: nginx/SSL setup failed — run manually: bash deploy/setup-nginx-on-vps.sh your@email.ru $DOMAIN"
  fi
fi

echo ""
echo "=============================================="
echo " Done."
echo " 1) nano $APP_DIR/.env  — passwords, bots, LETSENCRYPT_EMAIL"
echo " 2) DNS: ${DOMAIN:-masterclient45.ru} -> $(curl -s ifconfig.me 2>/dev/null || echo '83.222.18.141')"
echo " 3) https://${DOMAIN:-masterclient45.ru}/api/health"
echo "=============================================="

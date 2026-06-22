#!/bin/bash
# Подключение woner.ru к CRM на этом VPS (83.222.18.141).
# Перед запуском: A-запись woner.ru и www.woner.ru → IP этого сервера.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/aicrmpro}"
DOMAIN=woner.ru
SERVER_IP="${SERVER_IP:-$(curl -sf ifconfig.me || echo '83.222.18.141')}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod-external-ssl.yml}"

cd "$APP_DIR"

if [ -f .env ]; then
  EMAIL=$(grep -E '^LETSENCRYPT_EMAIL=' .env | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
  if [ -z "$EMAIL" ]; then
    EMAIL=$(grep -E '^BILLING_FROM_EMAIL=' .env | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
  fi
fi
EMAIL="${EMAIL:-admin@woner.ru}"

echo "==> Проверка DNS $DOMAIN → $SERVER_IP"
RESOLVED=$(dig +short "$DOMAIN" A | head -1)
if [ "$RESOLVED" != "$SERVER_IP" ]; then
  echo "ВНИМАНИЕ: $DOMAIN указывает на $RESOLVED, а не на $SERVER_IP."
  echo "Смените A-запись у регистратора/Beget, подождите 5–30 мин и запустите скрипт снова."
  echo "Продолжаем настройку nginx (SSL может не выпуститься до смены DNS)."
fi

echo "==> nginx: $DOMAIN"
cp deploy/nginx-woner.ru.conf "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
nginx -t
systemctl reload nginx

if [ "$RESOLVED" = "$SERVER_IP" ]; then
  echo "==> SSL (Let's Encrypt) для $DOMAIN"
  if certbot certificates 2>/dev/null | grep -q "Certificate Name: $DOMAIN"; then
    certbot renew --nginx --cert-name "$DOMAIN" --non-interactive || true
  else
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
      --non-interactive --agree-tos -m "$EMAIL" --redirect
  fi
  nginx -t && systemctl reload nginx
else
  echo "==> SSL пропущен (DNS ещё не на этом сервере)"
fi

echo "==> .env: основной домен $DOMAIN"
touch .env
for key in PUBLIC_URL FRONTEND_URL; do
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=https://${DOMAIN}|" .env
  else
    echo "${key}=https://${DOMAIN}" >> .env
  fi
done

if grep -q '^DOMAIN=' .env; then
  sed -i "s|^DOMAIN=.*|DOMAIN=${DOMAIN}|" .env
else
  echo "DOMAIN=${DOMAIN}" >> .env
fi

if grep -q '^MAX_WEBHOOK_URL=' .env; then
  sed -i "s|^MAX_WEBHOOK_URL=.*|MAX_WEBHOOK_URL=https://${DOMAIN}/webhook|" .env
else
  echo "MAX_WEBHOOK_URL=https://${DOMAIN}/webhook" >> .env
fi

if grep -q '^YOOKASSA_RETURN_URL=' .env; then
  sed -i "s|^YOOKASSA_RETURN_URL=.*|YOOKASSA_RETURN_URL=https://${DOMAIN}/dashboard?section=billing|" .env
fi

ORIGINS="https://${DOMAIN},https://www.${DOMAIN}"
if grep -q '^ALLOWED_ORIGINS=' .env; then
  sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=${ORIGINS}|" .env
else
  echo "ALLOWED_ORIGINS=${ORIGINS}" >> .env
fi

echo "==> nginx: редирект masterclient45.ru → $DOMAIN"
cp deploy/nginx-masterclient45-redirect.conf /etc/nginx/sites-available/masterclient45.ru
ln -sf /etc/nginx/sites-available/masterclient45.ru /etc/nginx/sites-enabled/masterclient45.ru
nginx -t && systemctl reload nginx

echo "==> Перезапуск backend (новые URL в .env)"
docker compose -f "$COMPOSE_FILE" up -d --build backend bot telegram-bot notification_worker

echo "==> Проверка"
sleep 2
curl -sf "http://127.0.0.1:3000/api/health" && echo ""
if [ "$RESOLVED" = "$SERVER_IP" ]; then
  curl -sf "https://${DOMAIN}/api/health" && echo "" || echo "HTTPS пока недоступен — проверьте certbot logs"
fi

echo ""
echo "Готово."
echo "  https://${DOMAIN}/"
echo "  Старый домен masterclient45.ru → редирект на https://${DOMAIN}/"
echo "  После смены DNS: bash deploy/connect-woner-domain.sh"

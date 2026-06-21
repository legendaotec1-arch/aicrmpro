#!/bin/bash
# Запускать ТОЛЬКО на сервере 83.222.18.141 после: ssh root@83.222.18.141
set -e

EMAIL="${1:-}"
DOMAIN="${2:-masterclient45.ru}"
if [ -z "$EMAIL" ]; then
  echo "Использование: bash setup-nginx-on-vps.sh ваш@email.ru [domain]"
  exit 1
fi

echo "==> nginx + certbot"
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx

cat > "/etc/nginx/sites-available/$DOMAIN" << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /webhook {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> SSL (Let's Encrypt)"
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo "==> Docker"
if [ -d /opt/aicrmpro ]; then
  cd /opt/aicrmpro
  docker compose -f docker-compose.prod-external-ssl.yml up -d
fi

echo "==> Проверка"
curl -sf http://127.0.0.1:3000/api/health && echo ""
echo "Готово. Откройте: https://$DOMAIN/api/health"

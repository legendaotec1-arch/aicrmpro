# aicrmpro.ru — деплой при уже готовом SSL

Домен: **https://aicrmpro.ru**  
В `.env` всегда указывайте:

```env
PUBLIC_URL=https://aicrmpro.ru
FRONTEND_URL=https://aicrmpro.ru
```

---

## Какой у вас вариант?

### A) SSL на Beget (или панели хостинга), приложение на VPS

Типично: домен привязан к Beget, сертификат включён в панели, а Node/Docker крутится на отдельном VPS.

> **Важно:** если в `public_html` лежит старый `index.html`, а прокси на VPS не включён, главная может открываться, а ссылки **`/m/...`**, **`/login`**, **`/dashboard`** — отдавать **404 Not Found** (Apache/nginx Beget).  
> Подробно: **`deploy/BEGET-FIX-NOT-FOUND.md`**

1. Скопируйте проект на VPS, настройте `.env` из `deploy/aicrmpro.env.example`.
2. Запуск **без Caddy**:

```bash
cp deploy/aicrmpro.env.example .env
nano .env   # пароли и токены ботов
docker compose -f docker-compose.prod-external-ssl.yml up -d --build
```

3. В панели Beget (или DNS) настройте **проксирование всего сайта** на IP VPS (не только главную страницу):

| Путь на сайте | Куда проксировать |
|---------------|-------------------|
| `/` (весь сайт, включая `/m/`, `/login`, `/api`) | `http://IP_VPS:3000` |
| `/webhook` | `http://IP_VPS:3001` |

Удалите или отключите старую статику в `public_html`, иначе Beget может отдавать её вместо прокси.

Проверка после настройки: `https://aicrmpro.ru/api/health` → JSON с `"status":"ok"` и заголовок `X-Powered-By: Express`.

Если в панели только один «обратный прокси» на домен — укажите порт **3000**; для MAX webhook может понадобиться правило для `/webhook` → **3001** (через nginx на VPS, см. вариант B).

4. Webhook MAX в кабинете MAX:

```text
https://aicrmpro.ru/webhook
```

5. Проверка:

```text
https://aicrmpro.ru/api/health
https://aicrmpro.ru/login
```

---

### B) SSL и Docker на одном VPS (сертификат уже лежит на сервере)

Сертификаты, например: `/etc/letsencrypt/live/aicrmpro.ru/`

1. Положите копии в проект:

```bash
mkdir -p deploy/certs
cp /etc/letsencrypt/live/aicrmpro.ru/fullchain.pem deploy/certs/
cp /etc/letsencrypt/live/aicrmpro.ru/privkey.pem deploy/certs/
```

2. В `docker-compose.prod.yml` замените Caddyfile на кастомный — в `caddy` volumes:

```yaml
- ./deploy/Caddyfile.custom-cert:/etc/caddy/Caddyfile:ro
- ./deploy/certs:/certs:ro
```

3. В `.env`:

```env
DOMAIN=aicrmpro.ru
```

4. Запуск:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**Не** запускайте второй certbot/Caddy с авто-SSL на том же домене — сертификат уже есть.

---

### C) SSL на VPS, nginx терминирует HTTPS (без Caddy в Docker)

1. Запустите приложение:

```bash
docker compose -f docker-compose.prod-external-ssl.yml up -d --build
```

2. Установите nginx на хост, возьмите шаблон `deploy/nginx-aicrmpro.conf.example`, укажите пути к **вашим** `ssl_certificate` и `ssl_certificate_key`.

3. Активируйте сайт:

```bash
ln -s /etc/nginx/sites-available/aicrmpro.ru /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Порты 80/443 занимает nginx, Docker слушает только `127.0.0.1:3000` и `:3001`.

---

## База Beget (внешний PostgreSQL)

Если используете БД Beget (`ruthohegrilee.beget.app` и т.п.):

```env
DB_HOST=ruthohegrilee.beget.app
DB_PORT=5432
DB_NAME=aicrmpro
DB_USER=cloud_user
DB_PASSWORD=...
```

В compose **уберите** сервис `postgres` или не поднимайте его — только `backend`, боты, worker. Выполните миграцию `backend/src/db/migrations/002_telegram_messenger.sql` вручную.

---

## Чеклист после запуска

- [ ] `https://aicrmpro.ru` открывается, нет ошибки сертификата
- [ ] `https://aicrmpro.ru/api/health` → `{"status":"ok"}`
- [ ] Регистрация мастера → кабинет → раздел «Ссылки» показывает `https://aicrmpro.ru/m/...`
- [ ] MAX webhook: `https://aicrmpro.ru/webhook`
- [ ] Загрузка логотипа в профиле сохраняется (volume `uploads`)

---

## Обновление

```bash
cd /opt/aicrmpro
git pull
docker compose -f docker-compose.prod-external-ssl.yml build
docker compose -f docker-compose.prod-external-ssl.yml up -d
```

(или `docker-compose.prod.yml`, если используете Caddy.)

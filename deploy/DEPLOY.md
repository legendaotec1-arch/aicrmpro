# Деплой BookFlow на сервер с доменом

Краткий план: **VPS** → **DNS на IP сервера** → **Docker** → **HTTPS (Caddy)** → **webhook ботов**.

---

## 1. Что вам понадобится

| Что | Зачем |
|-----|--------|
| VPS (Ubuntu 22.04/24.04) | 2 GB RAM, 2 vCPU достаточно для старта |
| Домен (например `aicrmpro.ru`) | Сайт записи и ссылки для клиентов |
| SSH-доступ к серверу | Установка и обновления |
| Токены MAX и Telegram | Боты и уведомления |

Подойдут: Timeweb, Selectel, Beget VPS, REG.RU Cloud и т.п.

> **Beget PostgreSQL** (как в `init-db.js`) можно использовать вместо контейнера `postgres`: в `.env` укажите `DB_HOST=...beget.app`, уберите сервис `postgres` из compose и выполните миграции вручную.

---

## 2. DNS — привязка домена

В панели регистратора домена:

| Тип | Имя | Значение |
|-----|-----|----------|
| **A** | `@` | `IP_ВАШЕГО_VPS` |
| **A** | `www` | `IP_ВАШЕГО_VPS` (опционально) |

Распространение DNS: от 5 минут до 24 часов.

Проверка (с вашего ПК):

```bash
ping aicrmpro.ru
```

---

## 3. Подготовка сервера

Подключитесь по SSH:

```bash
ssh root@IP_ВАШЕГО_VPS
```

Установите Docker:

```bash
apt update && apt upgrade -y
apt install -y git curl
curl -fsSL https://get.docker.com | sh
```

Откройте порты в файрволе (если включён UFW):

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

---

## 4. Загрузка проекта на сервер

**Вариант A — Git (удобнее для обновлений):**

```bash
cd /opt
git clone https://github.com/ВАШ_АККАУНТ/aicrmpro.git
cd aicrmpro
```

**Вариант B — архив с компьютера:**

На Windows (PowerShell), из папки проекта:

```powershell
scp -r C:\Users\user\Desktop\aicrmpro root@IP_ВАШЕГО_VPS:/opt/aicrmpro
```

На сервере:

```bash
cd /opt/aicrmpro
```

---

## 5. Настройка окружения

```bash
cp deploy/.env.production.example .env
nano .env
```

Обязательно задайте:

```env
DOMAIN=aicrmpro.ru
ACME_EMAIL=you@email.com

PUBLIC_URL=https://aicrmpro.ru
FRONTEND_URL=https://aicrmpro.ru

DB_PASSWORD=очень_сложный_пароль
JWT_SECRET=случайная_строка_32+_символов

MAX_BOT_TOKEN=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=YourBot
MAX_BOT_USERNAME=your_max_bot
```

Сохраните файл (`Ctrl+O`, `Enter`, `Ctrl+X` в nano).

Папка для загрузок (логотипы, фото):

```bash
mkdir -p uploads
```

---

## 6. Запуск в продакшене

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Проверка:

```bash
docker compose -f docker-compose.prod.yml ps
curl -s https://aicrmpro.ru/api/health
```

Caddy сам получит **SSL-сертификат Let's Encrypt** (нужны открытые 80/443 и корректная A-запись).

---

## 7. Миграция БД (если база уже была)

На **новой** установке схема применится из `schema.sql` при первом старте Postgres.

Если база **уже существует**, выполните на сервере:

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d crm_max -f /docker-entrypoint-initdb.d/migrations/002_telegram_messenger.sql
```

(или подключитесь к внешней БД Beget и выполните SQL из `backend/src/db/migrations/`.)

---

## 8. Webhook для MAX

В кабинете разработчика MAX укажите:

```text
https://aicrmpro.ru/webhook
```

Caddy проксирует `/webhook` на контейнер `bot:3001`.

Проверьте, что `PUBLIC_URL` и `MAX_BOT_TOKEN` в `.env` верные, затем:

```bash
docker compose -f docker-compose.prod.yml restart bot
```

---

## 9. Telegram

1. Создайте бота у [@BotFather](https://t.me/BotFather), скопируйте токен в `TELEGRAM_BOT_TOKEN` (нужен и боту, и **backend** для входа клиентов на сайте).
2. `TELEGRAM_BOT_USERNAME` — имя без `@`.
3. В BotFather: **/setdomain** — укажите домен сайта (`woner.ru`), иначе виджет «Войти через Telegram» на странице записи не заработает.
3. Бот работает в режиме **long polling** (отдельный webhook для Telegram не обязателен на старте).

Перезапуск:

```bash
docker compose -f docker-compose.prod.yml restart telegram-bot
```

---

## 10. Ссылки для мастеров

После деплоя в кабинете мастера (раздел **Ссылки**) появятся адреса вида:

- `https://aicrmpro.ru/m/...?ch=max`
- `https://aicrmpro.ru/m/...?ch=telegram`

Они берутся из `PUBLIC_URL` в `.env`.

---

## 11. Обновление версии

```bash
cd /opt/aicrmpro
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## 12. Частые проблемы

| Проблема | Решение |
|----------|---------|
| Сайт не открывается | Проверьте DNS, `ufw`, `docker ps`, логи `docker compose -f docker-compose.prod.yml logs caddy` |
| Нет HTTPS | Домен должен указывать на сервер; порты 80/443 открыты; в `.env` задан `DOMAIN` |
| API 502 | `docker compose logs backend` — чаще всего БД или неверный `DB_PASSWORD` |
| Фото не грузятся | Volume `uploads_data`; путь `/uploads` на backend |
| Бот MAX молчит | Webhook URL, токен, `docker compose logs bot` |
| CORS ошибки | `FRONTEND_URL` = ваш HTTPS-домен без слэша в конце |

---

## Схема

```text
Интернет
   │
   ▼
[Caddy :443] ──► backend:3000  (сайт + /api + /uploads)
   │
   ├── /webhook ──► bot:3001 (MAX)
   │
postgres + worker + telegram-bot (внутренняя сеть Docker)
```

---

## Локальная проверка перед продом

```bash
cp deploy/.env.production.example .env
# PUBLIC_URL=http://localhost — для теста без SSL используйте docker-compose.yml
```

Для продакшена всегда используйте **`docker-compose.prod.yml`** и реальный домен в `PUBLIC_URL`.

# Быстрый деплой на 83.222.18.141

## 1. DNS

Убедитесь, что **aicrmpro.ru** указывает на сервер:

| Тип | Имя | Значение |
|-----|-----|----------|
| A | @ | `83.222.18.141` |
| A | www | `83.222.18.141` |

## 2. Заливка с вашего ПК (Windows)

В PowerShell:

```powershell
cd C:\Users\user\Desktop\aicrmpro
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\upload-and-deploy.ps1
```

Введите пароль `root` когда спросит SSH/SCP (2–3 раза).

Скрипт:
- упакует проект без `node_modules`;
- создаст `/opt/aicrmpro` на сервере;
- установит Docker (если нет);
- соберёт и запустит контейнеры.

## 3. Настройка .env на сервере

```powershell
ssh root@83.222.18.141
nano /opt/aicrmpro/.env
```

Заполните минимум:

```env
PUBLIC_URL=https://aicrmpro.ru
FRONTEND_URL=https://aicrmpro.ru
DB_PASSWORD=...
JWT_SECRET=...
MAX_BOT_TOKEN=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...
```

Сохраните (`Ctrl+O`, Enter, `Ctrl+X`), перезапуск:

```bash
cd /opt/aicrmpro
docker compose -f docker-compose.prod-external-ssl.yml up -d --build
```

## 4. SSL (у вас уже на домене)

Если SSL на **Beget** — в панели проксируйте на `http://83.222.18.141:3000`, webhook `/webhook` → `:3001`.

Если SSL на **этом же VPS** — nginx по примеру `deploy/nginx-aicrmpro.conf.example`.

Проверка на сервере:

```bash
curl http://127.0.0.1:3000/api/health
```

Снаружи: https://aicrmpro.ru/api/health

## 5. MAX webhook

```
https://aicrmpro.ru/webhook
```

## Ручная заливка (без скрипта)

```powershell
ssh root@83.222.18.141 "mkdir -p /opt/aicrmpro"
scp -r C:\Users\user\Desktop\aicrmpro\* root@83.222.18.141:/opt/aicrmpro/
ssh root@83.222.18.141 "bash /opt/aicrmpro/deploy/install-server.sh"
```

(долго из‑за `node_modules` — лучше скрипт `upload-and-deploy.ps1`)

## Полезные команды на сервере

```bash
cd /opt/aicrmpro
docker compose -f docker-compose.prod-external-ssl.yml ps
docker compose -f docker-compose.prod-external-ssl.yml logs -f backend
docker compose -f docker-compose.prod-external-ssl.yml restart
```

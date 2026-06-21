# Деплой, если SSH не пускает (Permission denied)

Архив проекта: **`deploy/aicrmpro-deploy.zip`** (создайте: `.\deploy\make-deploy-zip.ps1`)

## Вариант A — консоль Beget на VPS (рекомендуется)

1. Beget → **Облако/VPS** → сервер **83.222.18.141** → **Консоль** (браузер).
2. Загрузите `aicrmpro-deploy.zip` в `/tmp` (файловый менеджер SFTP или `scp` с другого ПК).
3. В консоли:

```bash
apt-get update -qq && apt-get install -y unzip
mkdir -p /opt/aicrmpro
rm -rf /opt/aicrmpro/*
unzip -oq /tmp/aicrmpro-deploy.zip -d /opt/aicrmpro
cd /opt/aicrmpro
cp deploy/aicrmpro.env.example .env
nano .env   # пароли, токены, LETSENCRYPT_EMAIL=ваш@email.ru
bash deploy/install-server.sh
```

4. Проверка: `curl -s http://127.0.0.1:3000/api/health`

---

## Вариант B — SSH с ПК (когда знаете пароль)

В PowerShell:

```powershell
cd C:\Users\user\Desktop\aicrmpro
.\deploy\upload-and-deploy.ps1
```

Введите пароль **root** (3 раза: ssh, scp, ssh).

---

## Вариант C — свой SSH-ключ (больше не спрашивать пароль)

На ПК:

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\aicrmpro -N '""'
type $env:USERPROFILE\.ssh\aicrmpro.pub
```

Скопируйте строку `ssh-ed25519 ...` в консоль Beget на сервере:

```bash
mkdir -p ~/.ssh
echo "ВСТАВЬТЕ_СТРОКУ_ПУБЛИЧНОГО_КЛЮЧА" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
```

Потом с ПК:

```powershell
ssh -i $env:USERPROFILE\.ssh\aicrmpro root@83.222.18.141
.\deploy\upload-and-deploy.ps1
```

---

## После деплоя

- https://aicrmpro.ru/api/health
- Если 404 на `/m/...`: `bash /opt/aicrmpro/deploy/setup-nginx-on-vps.sh ваш@email.ru`

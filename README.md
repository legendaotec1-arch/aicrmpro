# Wonder.ru — CRM для мастеров и онлайн-запись

## 📋 Описание

**Wonder.ru** — система управления записями клиентов в MAX, Telegram и на сайте. Система позволяет мастерам (стилистам, косметологам, барберам и др.) создать свою онлайн-запись через уникальную ссылку, а клиентам — записываться к ним без звонков и сообщений.

## ✨ Возможности

### Для клиентов:
- Запись к мастеру через уникальную ссылку
- Просмотр портфолио и прайс-листа
- Выбор удобной даты и времени в календаре
- Уведомления за 24 часа и 3 часа до записи
- Отмена и редактирование записи через бота

### Для мастеров:
- Админ-панель с полным управлением
- Загрузка логотипа, фото, прайс-листа
- Настройка расписания работы
- Ручная запись клиентов
- Рассылка сообщений клиентам
- Интеграция с Яндекс.Картами

## 🛠 Технологии

- **Бэкенд**: Node.js + Express + PostgreSQL
- **Фронтенд**: React + Vite + TailwindCSS
- **Бот**: Node.js + MAX API
- **База данных**: PostgreSQL
- **Уведомления**: node-cron

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 18+
- PostgreSQL 15+
- Docker и Docker Compose (опционально)

### Установка и запуск

#### 1. Клонирование и установка зависимостей

```bash
# Клонируйте репозиторий
git clone <repo-url>
cd crm-max

# Установите зависимости для всех компонентов
npm run install:all
```

#### 2. Настройка базы данных

```bash
# Создайте базу данных PostgreSQL
createdb crm_max

# Выполните схему (находится в backend/src/db/schema.sql)
psql -d crm_max -f backend/src/db/schema.sql
```

#### 3. Настройка переменных окружения

```bash
# Скопируйте примеры .env файлов и настройте их
cp backend/.env.example backend/.env
cp bot/.env.example bot/.env

# Отредактируйте .env файлы, указав ваши значения
```

#### 4. Запуск

```bash
# Запуск бэкенда
cd backend && npm run dev

# В другом терминале запуск фронтенда
cd frontend && npm run dev

# Запуск бота (в третьем терминале)
cd bot && npm run dev

# Запуск worker уведомлений
cd backend && npm run worker
```

### Запуск через Docker

```bash
# Копируйте .env.example в .env и заполните значения
cp .env.example .env

# Запустите все сервисы
docker-compose up -d

# Проверьте статус
docker-compose ps
```

## 📁 Структура проекта

```
crm-max/
├── backend/              # Бэкенд сервер (Node.js + Express)
│   └── src/
│       ├── config/       # Конфигурация БД
│       ├── db/           # Схема PostgreSQL
│       ├── routes/       # API маршруты
│       ├── workers/      # Worker для уведомлений
│       └── server.js     # Точка входа
├── frontend/             # Фронтенд (React + Vite)
│   └── src/
│       ├── pages/        # Страницы
│       ├── App.jsx       # Главный компонент
│       └── main.jsx      # Точка входа
├── bot/                  # Бот для MAX
│   └── src/
│       └── index.js      # Логика бота
├── uploads/              # Загруженные файлы
├── docker-compose.yml    # Docker конфигурация
└── README.md             # Этот файл
```

## 🌐 API Endpoints

### Аутентификация
- `POST /api/auth/register` — Регистрация мастера
- `POST /api/auth/login` — Вход мастера
- `GET /api/auth/verify` — Проверка токена

### Мастер (защищенные)
- `GET /api/master/me/profile` — Профиль мастера
- `PUT /api/master/me/profile` — Обновление профиля
- `GET /api/master/me/schedule` — Расписание работы
- `POST /api/master/me/schedule` — Сохранение расписания
- `GET /api/master/me/prices` — Прайс-лист
- `POST /api/master/me/prices` — Добавить/обновить услугу
- `GET /api/master/me/portfolio` — Портфолио
- `POST /api/master/me/portfolio` — Добавить фото
- `GET /api/master/me/clients` — Список клиентов
- `POST /api/master/me/broadcast` — Рассылка
- `GET /api/master/me/link` — Получить ссылку для клиентов

### Клиент (публичные)
- `GET /api/master/:id` — Данные мастера
- `GET /api/client/:id/slots?date=YYYY-MM-DD` — Свободные слоты
- `POST /api/client/book` — Создать запись
- `GET /api/client/:maxUserId` — Записи клиента
- `POST /api/client/cancel/:id` — Отменить запись

### Записи (защищенные)
- `GET /api/appointments` — Все записи мастера
- `POST /api/appointments` — Создать запись вручную
- `PUT /api/appointments/:id` — Обновить запись
- `DELETE /api/appointments/:id` — Удалить запись

## 🔗 Интеграция с MAX

Для работы бота необходимо:

1. Зарегистрировать бота в MAX
2. Получить токен бота
3. Установить webhook URL: `https://your-domain.com/webhook`
4. Настроить MAX_BOT_TOKEN в .env

## 📝 Конфигурация

### Переменные окружения бэкенда (.env)

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm_max
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
```

### Переменные окружения бота (.env)

```env
MAX_BOT_TOKEN=your_bot_token
MAX_API_URL=https://api.max.ru
BACKEND_URL=http://localhost:3000
```

## 🗺️ Интеграция с Яндекс.Картами

Для добавления карты на страницу мастера используется `@pbe/react-yandex-maps`:

```jsx
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';

function AddressPicker({ onAddressSelect }) {
  // Компонент для выбора адреса на карте
}
```

## ⏰ Система уведомлений

Worker запускается по расписанию и проверяет записи каждые 10 минут:

- За 24 часа до записи отправляется напоминание
- За 3 часа до записи отправляется напоминание

Конфигурация cron находится в `backend/src/workers/notificationWorker.js`

## 🔒 Безопасность

- Пароли хешируются с помощью bcrypt
- JWT токены для аутентификации
- CORS настроен для защиты от межсайтовых запросов
- Защищенные маршруты требуют Bearer токен

## 📄 Лицензия

MIT
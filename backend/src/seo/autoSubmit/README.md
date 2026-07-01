# SEO Auto-Submit: автоматическое размещение на внешних площадках

## Что это

Готовый модуль для **автоматического линкбилдинга** через API и формы
внешних площадок. Вместо ручного постинга на 80+ сайтов — одна команда
или кнопка в админке.

## Каталог: 82 площадки

### Готовы к автосабмиту (26 API)
- **Reddit** (r/SaaS, r/startups, r/IndieHackers) — `REDDIT_OAUTH_TOKEN`
- **Telegram** — `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHANNEL_ID`
- **ВКонтакте** — `VK_ACCESS_TOKEN` + `VK_OWNER_ID`
- **Press-feed.ru** — `PRESS_FEED_API_KEY`
- **Product Hunt** — `PRODUCTHUNT_DEVELOPER_TOKEN`
- **GitHub Profile** — `GITHUB_TOKEN` + `GITHUB_USERNAME`
- **Medium, LinkedIn, Twitter/X, Pinterest, Tumblr, Mastodon, Threads, Bluesky** — каждый свой токен
- **Закладки**: Pocket, Raindrop, Diigo, Delicious, Mix

### Готовы к form-сабмиту (16)
- SaaSHub, AlternativeTo, G2, Capterra, SourceForge, Crunchbase,
  BetaList, BetaPage, Wellfound, F6S, Trustpilot, Яндекс.Маркет, Отзовик
- Скрипт может сабмитить через Puppeteer/Playwright (требует доработки)

### Только ручной постинг
- VC.ru, Дзен, Habr, Pikabu, Toster, Quora, YC, Hacker News
- Для HN написан dry-run с проверкой дублей через Algolia API

## Как запустить

### 1. Preview (без реальной отправки)
```bash
node scripts/auto-submit.js --preview --limit=10
node scripts/auto-submit.js --preview --link-key=reddit-r-saas
```

### 2. Реальный автосабмит
```bash
node scripts/auto-submit.js --limit=5 --platform=reddit
node scripts/auto-submit.js --platform=telegram,vk,social
```

### 3. Через админку
`SEO → Внешние ссылки → кнопка "Автосабмит (10)"` — для топ-10 запланированных
площадок с самым высоким DR и приоритетом. Также можно превьюить или
отправлять по одной через кнопки **Preview** / **Auto** в строке.

### 4. HTTP API
```bash
# Preview одной площадки
curl -X POST http://localhost:3000/api/seo/auto-submit/link \
  -H "Content-Type: application/json" \
  -d '{"link_key":"reddit-r-saas","dryRun":true}'

# Запустить batch
curl -X POST http://localhost:3000/api/seo/auto-submit/run \
  -H "Content-Type: application/json" \
  -d '{"limit":10,"platform":"reddit,telegram"}'

# Список адаптеров с переменными
curl http://localhost:3000/api/seo/auto-submit/adapters
```

## Настройка токенов

Создайте файл `backend/.env.local` (или добавьте в `.env`):

```bash
# Reddit
REDDIT_OAUTH_TOKEN=ya2.Axxxxxxxxxxxxxxxxxxxxxxxxxxxx
# или логин/пароль:
# REDDIT_CLIENT_ID=...
# REDDIT_CLIENT_SECRET=...
# REDDIT_USERNAME=...
# REDDIT_PASSWORD=...

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHANNEL_ID=@woner_official

# ВКонтакте
VK_ACCESS_TOKEN=vk1.a.12345...
VK_OWNER_ID=-1234567

# Press-feed.ru
PRESS_FEED_API_KEY=pf_live_...
PRESS_FEED_CONTACT_EMAIL=pr@woner.ru

# Product Hunt
PRODUCTHUNT_DEVELOPER_TOKEN=...

# GitHub
GITHUB_TOKEN=ghp_xxxxxx
GITHUB_USERNAME=woner

# Medium
MEDIUM_INTEGRATION_TOKEN=...

# LinkedIn
LINKEDIN_ACCESS_TOKEN=AQU...
LINKEDIN_AUTHOR_URN=urn:li:organization:1234567

# Twitter / X
TWITTER_BEARER_TOKEN=AAAA...

# Pinterest
PINTEREST_ACCESS_TOKEN=pina_...
PINTEREST_BOARD_ID=123456789

# Mastodon
MASTODON_ACCESS_TOKEN=...
MASTODON_INSTANCE=mastodon.social

# Threads
THREADS_ACCESS_TOKEN=...
THREADS_USER_ID=...

# Bluesky
BLUESKY_HANDLE=woner.bsky.social
BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Bookmarks
POCKET_ACCESS_TOKEN=...
RAINDROP_TOKEN=...
DIIGO_API_KEY=...
DIIGO_USER=...
DELICIOUS_USER=...
DELICIOUS_PASSWORD=...
MIX_TOKEN=...
```

После добавления токенов нужно перезапустить backend:
```bash
docker compose restart backend
```

## Приоритеты и rate limits

- Между сабмитами 2-секундная пауза (оркестратор).
- Reddit: не более 1 поста в r/SaaS в неделю, лучше в пятницу.
- HackerNews: ручной сабмит в прайм-тайм (пн-ср 9:00-11:00 EST).
- Product Hunt: ручной launch в будни, лучше во вторник/среду.
- Telegram: API limit 30 msg/s — для нашего объёма это не проблема.
- VK: API limit 3 req/s — 2-сек паузы достаточно.
- Reddit OAuth: 60 req/min — безопасно.

## Безопасность

- Все токены хранятся в env, **никогда не коммитятся в git**.
- Перед массовым сабмитом — обязательно сделать `--preview`.
- Требует ручной модерации (requires_review=true): Product Hunt, Press-feed,
  LinkedIn, Trustpilot, G2, Software Advice, Crunchbase, BetaList, XDA, Pikabu.

## Где смотреть результаты

`SEO → Внешние ссылки`:
- Столбец «Статус»: План / В работе / Live / Отклонено
- Бейдж API/Webhook/Form: способ автосабмита
- Бейдж ⚠: требует ручной проверки
- Время последней попытки и сообщение
- Кнопка `Auto` — отправить на площадку
- Кнопка `Preview` — посмотреть, что будет отправлено
- Кнопка `Live` — пометить вручную как опубликованное

## Архитектура

```
backend/src/seo/autoSubmit/
├── orchestrator.js                # выбор адаптера + выполнение
├── adapters/
│   ├── base.js                    # базовый класс
│   ├── reddit.js                  # OAuth2 password flow
│   ├── telegram.js                # Bot API
│   ├── vk.js                      # API v5.199
│   ├── pressfeed.js               # JSON API
│   ├── producthunt.js             # GraphQL (требует ручной)
│   ├── github.js                  # REST API
│   ├── hackernews.js              # Algolia API + manual submit
│   ├── bookmark.js                # 5 сервисов в одном файле
│   └── social.js                  # Medium/LinkedIn/Twitter/...
└── README.md
```

## Следующие шаги

1. **Добавить Puppeteer-адаптер** для form-based площадок (SaaSHub, G2 и т.д.)
2. **Добавить cron-задачу** в `articleCron.js` для ежедневного автосабмита
3. **Добавить Telegram-уведомления** о результатах сабмита
4. **Добавить аналитику** — отслеживание роста DR по Ahrefs/SEMrush API

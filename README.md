# polka

Два приложения в одном репозитории:

```
frontend/   Nuxt 4 + @nuxt/ui (Vue 3) — UI
backend/    Fastify 5 + TypeScript (ESM) — API и обращения к OpenRouter
```

## Установка

```bash
npm run install:all        # ставит зависимости frontend и backend
npm install                # зависимости корня (concurrently)
```

## Запуск

```bash
npm run dev                # frontend :3000 + backend :3001 вместе
npm run dev:front          # только Nuxt  (http://localhost:3000)
npm run dev:back           # только Fastify (http://localhost:3001)
```

Проверка API: `curl http://localhost:3001/health` → `{"ok":true}`.

## Переменные окружения

**backend/.env** (шаблон — `backend/.env.example`):

| Переменная       | По умолчанию            | Назначение                         |
| ---------------- | ----------------------- | ---------------------------------- |
| `OPENROUTER_KEY` | —                       | ключ OpenRouter (обязателен)       |
| `CORS_ORIGIN`    | `http://localhost:3000` | разрешённый источник для CORS      |
| `PORT`           | `3001`                  | порт API                           |

Фронтенду ключ не нужен: клиент ходит в `/api/**`, а Nuxt проксирует эти
запросы на бэкенд (`routeRules` в `frontend/nuxt.config.ts`). Порт бэкенда
переопределяется переменной `BACKEND_PORT` при запуске Nuxt.

## API

- `GET  /health` → `{ ok: true }`
- `POST /api/ask` — `{ prompt }` → `{ text }`; история чата хранится в памяти инстанса
- `POST /api/summarize` — `{ prompt?, cards: [{ title, authorName, description, url }] }` → `{ text }`
- `GET  /api/items?limit=100` → `{ items }` — карточки, новые первыми (`limit` 1..500)
- `POST /api/items` — `{ type?, url?, title?, thumbnail?, summary?, content?, fileId? }` → `201 { item }`;
  `type` из `youtube | tiktok | article | note` (по умолчанию `article`). `url` обязателен и
  должен быть http(s) для `youtube`/`tiktok`/`article`, необязателен для `note`
  (иначе `400 Некорректная ссылка`)
- `PATCH /api/items/:id` — частичное обновление (`type, url, title, thumbnail, summary,
  content, fileId`), обновляет `updatedAt` → `{ item }`; `404`, если карточки нет.
  Сюда фронтенд сохраняет саммари от ИИ
- `DELETE /api/items/:id` → `204`, или `404`, если карточки нет

Модель карточки (одинаковая на фронте и в БД):

```ts
interface Card {
  id: string
  type: 'youtube' | 'tiktok' | 'article' | 'note'
  url?: string        // у заметок её нет
  title: string
  thumbnail?: string
  summary?: string    // саммари от ИИ
  content?: string    // транскрипт или текст
  fileId?: string
  createdAt: string
  updatedAt: string
}
```

Ошибки возвращаются как `{ message }` со статусом 400/404/500/502.

## D1 (Cloudflare) локально

Карточки хранятся в Cloudflare D1. Для разработки достаточно локального
SQLite-состояния wrangler — платный аккаунт не нужен.

```bash
cd backend
npm run d1:migrate        # wrangler d1 migrations apply polka-db --local
```

- Миграции: `backend/migrations/*.sql`, биндинг `DB` — в `backend/wrangler.toml`.
- Локальное состояние: `backend/.wrangler/state/v3/d1` (в git не попадает).
- Посмотреть данные: `npx wrangler d1 execute polka-db --local --command "select * from items"`.
- Fastify ходит в D1 через `getPlatformProxy()` из `wrangler` (`backend/src/lib/db.ts`),
  поэтому код запросов не меняется при переходе на remote.
- Для production: реальный `database_id` в `wrangler.toml` (из `npx wrangler d1 create polka-db`),
  `--remote` для миграций и деплой на Cloudflare Workers с биндингом `DB`.

## Скрипты

| Команда             | Что делает                        |
| ------------------- | --------------------------------- |
| `npm run build`     | production-сборка Nuxt            |
| `npm run typecheck` | `nuxt typecheck` + `tsc --noEmit` |

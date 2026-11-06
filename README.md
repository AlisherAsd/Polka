# polka

Монорепозиторий на npm workspaces, два приложения:

```
frontend/   polka-frontend — Nuxt 4 + @nuxt/ui (Vue 3); UI и API (server/api, Nitro)
backend/    polka-backend  — Fastify 5 (ESM), только для локальной разработки
wrangler.jsonc              конфиг воркера: Nuxt SSR + /api + биндинг D1 (корень)
```

## Установка

```bash
npm install                # один раз в корне: ставит оба воркспейса
```

Зависимости обоих приложений поднимаются в корневой `node_modules`,
lock-файл один — `package-lock.json` в корне.

## Запуск

```bash
npm run dev                # frontend :3000 + backend :3001 вместе
npm run dev:front          # только Nuxt  (http://localhost:3000)
npm run dev:back           # только Fastify (http://localhost:3001)
```

В dev клиент ходит в `/api/**`, Nuxt проксирует запросы на Fastify (`:3001`),
а Fastify читает локальную D1. В проде те же эндпоинты обслуживает сам воркер
через Nitro-хендлеры `frontend/server/api/**` с биндингом `DB`.

Проверка API: `curl http://localhost:3001/health` → `{"ok":true}`.

## Сборка и деплой

```bash
npm run build              # Nuxt для Cloudflare Workers → frontend/.output
npm run deploy             # wrangler deploy из корня (wrangler.jsonc)
npm run typecheck          # nuxt typecheck + tsc --noEmit
```

Preset Nitro — `cloudflare_module` (`frontend/nuxt.config.ts`), переопределяется
`NITRO_PRESET`. Worker-конфиг лежит в корне (`wrangler.jsonc`):
`main` → `frontend/.output/server/index.mjs`, assets → `frontend/.output/public`.

**Настройки проекта в Cloudflare (Workers Builds):**

| Параметр            | Значение              |
| ------------------- | --------------------- |
| Root directory      | `/`                   |
| Build command       | `npm run build`       |
| Deploy command      | `npx wrangler deploy` |
| Node.js             | 24                    |

Локальная проверка без деплоя:

```bash
XDG_CONFIG_HOME=$PWD/.wrangler/config/xdg npx wrangler deploy --dry-run
```

(`XDG_CONFIG_HOME` внутри проекта — потому что `~/Library/Preferences/.wrangler`
на macOS бывает недоступен для записи; в бэкенде это делает `backend/src/env.ts`.)

## Переменные окружения

**Worker (production), задаётся в дашборде Cloudflare или в `wrangler.jsonc`:**

| Переменная             | По умолчанию | Назначение                                                    |
| ---------------------- | ------------ | ------------------------------------------------------------- |
| `NUXT_PUBLIC_API_BASE` | `""`         | пусто — API в том же воркере (same-origin)                    |
| `OPENROUTER_KEY` (secret) | —        | `npx wrangler secret put OPENROUTER_KEY`                      |

**backend/.env** (шаблон — `backend/.env.example`):

| Переменная       | По умолчанию            | Назначение                         |
| ---------------- | ----------------------- | ---------------------------------- |
| `OPENROUTER_KEY` | —                       | ключ OpenRouter (обязателен)       |
| `CORS_ORIGIN`    | `http://localhost:3000` | разрешённый источник для CORS      |
| `PORT`           | `3001`                  | порт API                           |

В dev фронтенду ничего не нужно: клиент ходит в `/api/**`, а Nuxt проксирует
эти запросы на Fastify (`routeRules` включается только вне production).
Порт бэкенда переопределяется переменной `BACKEND_PORT`.

> Fastify-бэкенд с `getPlatformProxy()` на Workers не запускается — он остаётся
> инструментом локальной разработки. Продовый API живёт в `frontend/server/api`
> (Nitro, биндинг D1), поэтому отдельный хостинг бэкенда больше не нужен.

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

## D1 (Cloudflare)

Карточки хранятся в Cloudflare D1. Для разработки достаточно локального
SQLite-состояния wrangler — платный аккаунт не нужен.

```bash
cd backend
npm run d1:migrate        # wrangler d1 migrations apply polka-db --local
```

- Миграции: `backend/migrations/*.sql` (единый источник правды для dev и воркера),
  биндинг `DB` — в `backend/wrangler.toml` и в корневом `wrangler.jsonc`.
- Локальное состояние: `backend/.wrangler/state/v3/d1` (Fastify) и
  `.wrangler/state/v3/d1` (воркер; в git не попадают).
- Посмотреть данные: `npx wrangler d1 execute polka-db --local --command "select * from items"`.
- Fastify ходит в D1 через `getPlatformProxy()` из `wrangler` (`backend/src/lib/db.ts`),
  поэтому код запросов не меняется при переходе на remote.
- Для production:
  ```bash
  npx wrangler d1 create polka-db              # взять database_id и вписать в wrangler.jsonc
  npm run d1:migrate:remote                    # миграции в боевую базу
  npx wrangler secret put OPENROUTER_KEY       # ключ модели
  npm run deploy
  ```
- Локальный прогон воркера: `XDG_CONFIG_HOME=$PWD/.wrangler/config/xdg npx wrangler dev --local`
  (миграции в локальную D1 воркера: `npx wrangler d1 migrations apply polka-db --local`).

## Скрипты

| Команда             | Что делает                        |
| ------------------- | --------------------------------- |
| `npm run build`            | production-сборка Nuxt            |
| `npm run deploy`           | `wrangler deploy` из корня        |
| `npm run d1:migrate`       | миграции в локальную D1 (Fastify) |
| `npm run d1:migrate:remote`| миграции в боевую D1              |
| `npm run typecheck`        | `nuxt typecheck` + `tsc --noEmit` |

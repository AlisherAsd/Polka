# polka

Один Cloudflare Worker: Nuxt SSR и `/api/**` на Nitro-хендлерах, база — D1.
Отдельного бэкенд-сервиса нет: Fastify удалён после переезда на Nitro.

```
frontend/       Nuxt 4 + @nuxt/ui: UI и API (server/api, Nitro), D1-биндинги
frontend/migrations/  миграции D1 (единый источник правды)
wrangler.jsonc  конфиг воркера: Nuxt SSR + /api + биндинг D1
```

## Установка

```bash
npm install                # из корня
```

Зависимости поднимаются в корневой `node_modules`, lock-файл один —
`package-lock.json` в корне.

## Запуск

```bash
npm run dev                # Nuxt dev на http://localhost:3000 (API и UI вместе)
```

В dev Nitro включает cloudflare-dev эмуляцию: `getPlatformProxy()` из wrangler
поднимает биндинги (D1) и кладёт их в `event.context.cloudflare`, так что те же
Nitro-хендлеры `frontend/server/api/**` работают локально без отдельного сервера.

Проверка API: `curl http://localhost:3000/api/items` → `{"items":[]}`.

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
на macOS бывает недоступен для записи; `npm run dev` и `nuxt.config.ts` уводят
его внутрь проекта автоматически.)

## Переменные окружения

**Worker (production), задаётся в дашборде Cloudflare или в `wrangler.jsonc`:**

| Переменная             | По умолчанию | Назначение                                                    |
| ---------------------- | ------------ | ------------------------------------------------------------- |
| `NUXT_PUBLIC_API_BASE` | `""`         | пусто — API в том же воркере (same-origin)                    |
| `OPENROUTER_KEY` (secret) | —        | `npx wrangler secret put OPENROUTER_KEY`                      |

**Локально (ключ модели):** `frontend/.env` с `OPENROUTER_KEY=` — Nitro читает
его как env при `npm run dev`.

Клиент всегда ходит на `/api/**` того же origin: в dev его обслуживают те же
Nitro-хендлеры через cloudflare-dev эмуляцию, в проде — воркер с биндингом `DB`.

> На macOS wrangler/miniflare кладут служебные файлы в
> `~/Library/Preferences/.wrangler`, куда часто нет прав (EPERM). `npm run dev`
> и `nuxt.config.ts` уводят их в `.wrangler/config/xdg` внутри проекта.

## API

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
npm run d1:migrate        # wrangler d1 migrations apply polka-db --local
```

- Миграции: `frontend/migrations/*.sql`, биндинг `DB` — в корневом `wrangler.jsonc`.
- Локальное состояние: `.wrangler/state/v3/d1` — одно и то же для `npm run dev`
  (cloudflare-dev) и `wrangler dev`; в git не попадает.
- Посмотреть данные: `npx wrangler d1 execute polka-db --local --command "select * from items"`.
- Для production:
  ```bash
  make login            # вход в Cloudflare
  make db-create        # создаст polka-db и впишет database_id в wrangler.jsonc
  make migrate-remote   # миграции в боевую базу
  make secret           # ключ OpenRouter в секреты воркера
  make ship             # typecheck + сборка + deploy
  ```
- Локальный прогон воркера: `XDG_CONFIG_HOME=$PWD/.wrangler/config/xdg npx wrangler dev --local`
  (миграции в локальную D1 воркера: `npx wrangler d1 migrations apply polka-db --local`).

## Makefile

Частые команды собраны в `make` (`make help` — список). Везде уже проставлен
`XDG_CONFIG_HOME` внутрь проекта, поэтому EPERM на macOS не всплывает.

| Команда              | Что делает                                                        |
| -------------------- | ----------------------------------------------------------------- |
| `make install`       | зависимости из корня                                              |
| `make dev`           | dev-сервер :3000 (UI + API + локальная D1)                        |
| `make check`         | проверка типов                                                    |
| `make deploy-local`  | сборка + `wrangler deploy --dry-run`                              |
| `make setup`         | с нуля: install → создать D1 → локальные миграции                 |
| `make db-create`     | создать D1 (если нет) и вписать `database_id` в `wrangler.jsonc`  |
| `make db-id`         | показать `database_id` из конфига и из аккаунта                   |
| `make migrate`       | миграции в локальную D1                                           |
| `make migrate-remote`| миграции в боевую D1                                              |
| `make secret`        | `wrangler secret put OPENROUTER_KEY` (интерактивно)               |
| `make login`         | `wrangler login` (интерактивно)                                   |
| `make ship`          | typecheck + сборка + `wrangler deploy`                            |
| `make clean`         | удалить артефакты сборки и локальную D1                           |

Интерактивные шаги (`login`, `secret`) автоматизировать нельзя, они вынесены
отдельно и вызываются один раз.

## Скрипты

| Команда             | Что делает                        |
| ------------------- | --------------------------------- |
| `npm run build`            | production-сборка Nuxt            |
| `npm run deploy`           | `wrangler deploy` из корня        |
| `npm run d1:migrate`       | миграции в локальную D1           |
| `npm run d1:migrate:remote`| миграции в боевую D1              |
| `npm run typecheck`        | `nuxt typecheck`                  |

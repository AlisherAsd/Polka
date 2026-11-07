# polka

Один Cloudflare Worker: Nuxt 4 (SSR) и `/api/**` на Nitro-хендлерах, база — Cloudflare D1.
Плюс нативное приложение для macOS на Tauri 2, которое использует тот же API.

```
app/                   Nuxt 4 + @nuxt/ui: UI (`app/`) и сервер (`app/server/`), D1-биндинги
app/migrations/        миграции D1 (единый источник правды)
contract.md            схема БД, связи и правила данных
wrangler.jsonc         конфиг воркера: Nuxt SSR + /api + биндинг D1
apps/desktop/          нативное приложение для macOS (Rust + Tauri, WKWebView)
Makefile               частые команды (`make help`)
```

## Требования

- Node.js 24 и npm 11
- для нативного приложения: Rust (`rustup`), Xcode Command Line Tools / Xcode
- аккаунт Cloudflare (только для деплоя)

## Установка

```bash
npm install                 # зависимости корня и frontend (npm workspaces)
cd apps/desktop && npm install   # только для нативного приложения
```

Lock-файл один — `package-lock.json` в корне. У нативного приложения свой
(`apps/desktop/package-lock.json`).

---

## 1. Локальный запуск веба

```bash
npm run dev        # или: make dev
```

- Открывается http://localhost:3000 — UI и API в одном процессе.
- Nitro включает cloudflare-dev эмуляцию: `getPlatformProxy()` из wrangler
  поднимает биндинги (D1) и кладёт их в `event.context.cloudflare`, поэтому
  `app/server/api/**` работает локально без отдельного сервера.
- Локальная база — `.wrangler/state/v3/d1`. Та же, что у `wrangler dev`.

Первичная подготовка базы (один раз):

```bash
npm run d1:migrate     # или: make migrate
```

Проверка:

```bash
curl http://localhost:3000/api/items     # {"items":[]}
curl http://localhost:3000/api/folders   # {"folders":[{"id":"ai-voult",...}]}
```

Ключ модели для `/api/ask` и `/api/summarize` — в `app/.env`:

```
OPENROUTER_KEY=sk-or-v1-...
```

Без него ручки отвечают `500 Ключ API не найден`, остальное работает.

### Если на macOS ошибки `EPERM ... ~/Library/Preferences/.wrangler`

Скрипт `npm run dev` уже уводит конфиг wrangler внутрь проекта
(`XDG_CONFIG_HOME=.wrangler/config/xdg`). Для ручных вызовов wrangler:

```bash
XDG_CONFIG_HOME=$PWD/.wrangler/config/xdg npx wrangler <команда>
```

---

## 2. Деплой: что делать при пуше

```bash
npm run typecheck      # или: make check      — типы
npm run build          # или: make deploy-local — сборка + `wrangler deploy --dry-run`
npm run deploy         # или: make ship       — сборка и выкладка воркера
```

Что важно:

1. **Миграции.** Если в коммите появились файлы `app/migrations/*.sql`,
   их надо применить к боевой D1 **до** или сразу после деплоя:
   ```bash
   npm run d1:migrate:remote      # или: make migrate-remote
   ```
   Иначе новые ручки упадут (`no such table`). `GET /api/board` в этом случае
   отдаёт пустой список вместо 500, `PATCH` — 503 с подсказкой.
2. **Секреты.** Ключ модели — секрет воркера:
   ```bash
   npx wrangler secret put OPENROUTER_KEY    # или: make secret
   ```
3. **Переменные.** `NUXT_PUBLIC_API_BASE` и `CORS_ORIGINS` — в `wrangler.jsonc`
   (`vars`). Меняются только новым деплоем.
4. **Автодеплой.** В Cloudflare Workers Builds (Settings → Build) должно быть:

   | Параметр         | Значение              |
   | ---------------- | --------------------- |
   | Root directory   | `/`                   |
   | Build command    | `npm run build`       |
   | Deploy command   | `npx wrangler deploy` |
   | Node.js          | 24                    |

   Тогда обычный `git push` в подключённую ветку собирает и выкладывает воркер.
5. **Проверка после деплоя:**
   ```bash
   curl -s https://<воркер>/api/items | head -c 120
   curl -s -o /dev/null -D - https://<воркер>/api/items -H 'origin: tauri://localhost' | grep -i access-control
   ```

Ручной деплой без `push`: `make ship` (typecheck → build → `wrangler deploy`).

---

## 3. Сборка нативного приложения (macOS)

Стек: Tauri 2 (Rust + системный WKWebView). Фронт берётся из той же кодовой
базы и собирается в статику (SPA) — SSR для натива отключается флагом.

### Сборка

```bash
npm run desktop:build
```

Внутри две команды:

1. `npm run desktop:web` — `NUXT_SPA=1 NUXT_PUBLIC_API_BASE=<адрес API> nuxt generate`
   → статика в `app/.output/public` (SSR отключается **только** для этой
   сборки, веб-деплой не затрагивается);
2. `tauri build` в `apps/desktop` — Rust-сборка и бандл `.app`.

Первый прогон компилирует зависимости (~1–2 мин), дальше — быстрее.

### Где результат

```
apps/desktop/src-tauri/target/release/bundle/macos/Полка.app
apps/desktop/src-tauri/target/release/polka-desktop     # бинарь внутри
```

Запуск: `open "apps/desktop/src-tauri/target/release/bundle/macos/Полка.app"`.

Инсталлятор `.dmg`:

```bash
cd apps/desktop
npx tauri build --bundles dmg app
# → src-tauri/target/release/bundle/dmg/Полка_1.0.0_aarch64.dmg
```

### Адрес API

`NUXT_PUBLIC_API_BASE` **пустой по умолчанию** — и в dev, и в вебе запросы идут
на тот же origin (`/api/**` обслуживает тот же воркер). Зашитых адресов в коде нет.

Статике (натив) адрес нужен явно — его подставляет `npm run desktop:web`:

```bash
# по умолчанию — прод-воркер, можно переопределить
NUXT_PUBLIC_API_BASE=https://мой-api npm run desktop:build
```

Если собрать статику без переменной, запросы уйдут в `tauri://`/`file://` и упадут
сразу — это видно при запуске, а не через «тихий» переход на прод.

Для загрузки UI из сети (без пересборки на каждое изменение) можно собрать
`.app` с `devUrl` — см. `apps/desktop/src-tauri/tauri.conf.json`.

### Разработка натива

```bash
cd apps/desktop
npm run dev     # поднимает nuxt dev (:3000) и окно WKWebView
```

### Подпись и нотаризация

Без сертификата `.app` запускается только локально (на других Mac — «повреждено»,
обход: `xattr -dr com.apple.quarantine Полка.app`). Для распространения:

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Имя (TEAMID)"
export APPLE_ID="you@example.com"
export APPLE_PASSWORD="app-specific-password"   # app-specific password
export APPLE_TEAM_ID="XXXXXXXXXX"
npm run desktop:build
```

### CORS

Origin нативного WebView должен быть разрешён на воркере (`CORS_ORIGINS`
в `wrangler.jsonc`): сейчас там `tauri://localhost`, `http://tauri.localhost`,
`https://tauri.localhost`. Если приложение шлёт другой origin, его видно в
веб-инспекторе (ПКМ → «Показать веб-инспектор») — добавьте и передеплойте воркер.

---

## Авторизация: транспорт

Один механизм для всех клиентов — токен сессии:

- **основной транспорт** — `Authorization: Bearer <token>` (натив, мобильные
  оболочки, любые внешние клиенты);
- **дополнительный** — httpOnly cookie `polka_session` (сайт с тем же origin).

Правила, которые не меняются при добавлении платформ:

- сервер выдаёт права только по токену; `Origin`, `User-Agent` и любые поля
  вроде «я нативный клиент» используются исключительно для логов;
- набор допустимых origin'ов задаётся в `CORS_ORIGINS` (`wrangler.jsonc`),
  звёздочка не используется — с `credentials` браузер её запрещает;
  для Android добавляйте `http://tauri.localhost`, для iOS — `capacitor://localhost`;
- секреты (`OPENROUTER_KEY`) живут только в воркере; личный ключ ИИ
  пользователя уходит заголовком `X-OpenRouter-Key` на один запрос
  и на сервере не сохраняется.

## API

- `GET /api/items?limit=100` → `{ items }`; `POST /api/items`, `PATCH /api/items/:id`, `DELETE /api/items/:id`
- `GET /api/folders`, `POST /api/folders` — папки (по умолчанию `ai-voult`)
- `GET /api/notes?folderId=&itemId=`, `POST /api/notes`, `GET/PATCH/DELETE /api/notes/:id`
- `GET /api/board`, `PATCH /api/board/:id` — позиции узлов доски (id карточки или заметки)
- `POST /api/summarize` — суммаризация; саммари сохраняется файлом в `ai-voult`
- `POST /api/transcript` — субтитры YouTube по ссылке
- `POST /api/ask` — чат с моделью

Модель карточки (`items`):

```ts
interface Card {
  id: string
  type: 'youtube' | 'tiktok' | 'article' | 'note'
  url?: string
  title: string
  thumbnail?: string
  summary?: string
  content?: string
  fileId?: string
  createdAt: string
  updatedAt: string
}
```

Заметки и папки — в [`app/API-notes.md`](app/API-notes.md).

---

## Скрипты

| Команда                     | Что делает                                         |
| --------------------------- | -------------------------------------------------- |
| `npm run dev`               | dev-сервер :3000 (UI + API + локальная D1)          |
| `npm run build`             | сборка воркера → `app/.output`                 |
| `npm run deploy`            | `wrangler deploy`                                   |
| `npm run typecheck`         | `nuxt typecheck`                                    |
| `npm run d1:migrate`        | миграции в локальную D1                             |
| `npm run d1:migrate:remote` | миграции в боевую D1                                |
| `npm run desktop:web`       | статика Nuxt для натива                             |
| `npm run desktop:build`     | статика + `.app` (Tauri)                            |
| `make help`                 | то же плюс `setup`, `db-create`, `secret`, `clean`  |

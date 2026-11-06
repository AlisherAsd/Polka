# Полка для macOS

Нативное приложение: Tauri 2 (Rust + WKWebView) поверх статики Nuxt.

## Сборка

```bash
# из корня репозитория
npm run desktop:build
```

Скрипт делает две вещи:

1. `NUXT_SPA=1 NUXT_PUBLIC_API_BASE=... npm run generate` — статическая SPA
   Nuxt в `frontend/.output/public` (SSR отключается только для этой сборки);
2. `tauri build` — `.app` и `.dmg` в `apps/desktop/src-tauri/target/release/bundle`.

## Разработка

```bash
cd apps/desktop
npm run dev     # поднимает Nuxt dev (:3000) и окно WKWebView
```

## Адрес API

Фронт ходит на абсолютный адрес из `NUXT_PUBLIC_API_BASE`
(по умолчанию `https://polka.alishersharipovtol.workers.dev`).
Origin нативного WebView (`tauri://localhost` на macOS) должен быть разрешён
в `CORS_ORIGINS` воркера на Cloudflare.

## Иконка приложения

Иконка в Dock и на рабочем столе берётся из `apps/desktop/src-tauri/icons/`.
Меняется одной командой из исходной картинки (лучше 1024×1024 PNG с прозрачностью):

```bash
cd apps/desktop
npm run icons                 # tauri icon ../../frontend/public/logofull.png
npm run build                 # пересобрать .app
cp -R src-tauri/target/release/bundle/macos/Полка.app /Applications/
```

- `npm run icons` пересоздаёт весь набор (`icon.icns`, `icon.ico`, PNG-размеры, а также android/ios) из исходника.
- Источник задан в `package.json` → `scripts.icons`; чтобы поставить другую картинку, положи её в `frontend/public/` и поправь путь, либо запусти напрямую: `npx tauri icon путь/иконка.png`.
- Если в Dock осталась старая иконка, macOS кэширует её: удали приложение из `/Applications`, затем `killall Dock` и скопируй новое `.app`.

## Подпись

Без Apple Developer ID приложение запускается только локально.
Для распространения нужны сертификат "Developer ID Application" и нотаризация:

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: ..."
export APPLE_ID="you@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="XXXXXXXXXX"
npm run desktop:build
```

## Cargo

Зависимости кешируются в стандартном `~/.cargo`. Если там нет прав на запись,
исправьте владельца: `sudo chown -R $(whoami) ~/.cargo`.

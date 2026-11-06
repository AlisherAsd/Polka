// https://nuxt.com/docs/api/configuration/nuxt-config

// В `nuxt.config.ts` нет типов Node.js, поэтому читаем env без `process`.
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {};

// wrangler/miniflare пишут служебные файлы в ~/Library/Preferences/.wrangler,
// куда на macOS нет прав (EPERM). Уводим их конфиг-каталог внутрь проекта.
const nodeProcess = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process;

if (
  nodeProcess?.env &&
  !nodeProcess.env.XDG_CONFIG_HOME &&
  nodeProcess.env.PWD
) {
  nodeProcess.env.XDG_CONFIG_HOME = `${nodeProcess.env.PWD}/.wrangler/config/xdg`;
}

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // @nuxt/ui v4 сам подключает Tailwind (через @tailwindcss/vite),
  // поэтому собственный `vite.plugins: [tailwindcss()]` больше не нужен.
  modules: ["@nuxt/ui"],

  // SPA-режим для нативного приложения (`npm run desktop:build`):
  // страницы собираются статикой и ходят в API по абсолютному адресу.
  // Без флага `NUXT_SPA` всё как раньше — SSR под Cloudflare Workers.
  ssr: env.NUXT_SPA === "1" ? false : true,

  // Сборка под Cloudflare Workers (preset nitro). Локальный `nuxt dev`
  // этот параметр игнорирует, поэтому dev остаётся прежним.
  // В dev Nitro сам поднимает getPlatformProxy() из wrangler и кладёт биндинги
  // (D1) в event.context.cloudflare — API можно проверять без Fastify.
  nitro: {
    preset:
      env.NUXT_SPA === "1"
        ? "static"
        : (env.NITRO_PRESET ?? "cloudflare_module"),
    cloudflare: {
      dev: {
        // Конфиг лежит в корне монорепы, а не рядом с frontend/.
        configPath: "../wrangler.jsonc",
        // Общее состояние с `wrangler d1 ... --local`: миграции и данные одни.
        persistDir: "../.wrangler/state/v3",
      },
    },
  },

  // База API. Пустая строка = тот же origin: и в dev, и на проде /api/**
  // обслуживают Nitro-хендлеры этого же приложения.
  runtimeConfig: {
    public: {
      apiBase: "",
    },
  },

  css: ["~/assets/css/main.css"],

  // Тёмная тема не используется: принудительно light, чтобы компоненты Nuxt UI
  // не переключались вслед за системными настройками.
  colorMode: {
    preference: "light",
    fallback: "light",
    classSuffix: "",
    storageKey: "recall-color-mode",
  },

  // Цвета Nuxt UI задаются в `app/app.config.ts` (`ui.colors`).
  // `ui.theme.colors` здесь только дублировал список и не менял палитру —
  // из-за этого primary оставался встроенным `green`.

  app: {
    head: {
      htmlAttrs: { lang: "ru" },
      title: "Полка - твоя библиотека знаний",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "Собирайте видео, посты и статьи в одном месте.",
        },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/miniliogo.png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap",
        },
      ],
    },
  },
});

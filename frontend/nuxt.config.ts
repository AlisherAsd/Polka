// https://nuxt.com/docs/api/configuration/nuxt-config

// В `nuxt.config.ts` нет типов Node.js, поэтому читаем env без `process`.
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // @nuxt/ui v4 сам подключает Tailwind (через @tailwindcss/vite),
  // поэтому собственный `vite.plugins: [tailwindcss()]` больше не нужен.
  modules: ["@nuxt/ui"],

  // Сборка под Cloudflare Workers (preset nitro). Локальный `nuxt dev`
  // этот параметр игнорирует, поэтому dev остаётся прежним.
  nitro: {
    preset: env.NITRO_PRESET ?? "cloudflare_module",
  },

  // Адрес бэкенда (Fastify). Пустая строка = тот же origin: в dev запросы
  // идут на /api/** и их проксирует Nuxt, а на проде бэкенд должен быть
  // указан полным адресом через NUXT_PUBLIC_API_BASE.
  runtimeConfig: {
    public: {
      apiBase: "",
    },
  },

  // Прокси на локальный бэкенд нужен только в dev: на Workers его нет.
  routeRules: {
    "/api/**": {
      proxy:
        env.NODE_ENV === "production"
          ? undefined
          : `http://localhost:${env.BACKEND_PORT ?? 3001}/api/**`,
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

  ui: {
    theme: {
      colors: ["primary", "neutral"],
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: "ru" },
      title: "Recall — библиотека ссылок",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "Собирайте видео, посты и статьи в одном месте.",
        },
      ],
      link: [
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

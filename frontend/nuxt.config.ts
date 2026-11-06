// https://nuxt.com/docs/api/configuration/nuxt-config

// В `nuxt.config.ts` нет типов Node.js, поэтому читаем env без `process`.
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // @nuxt/ui v4 сам подключает Tailwind (через @tailwindcss/vite),
  // поэтому собственный `vite.plugins: [tailwindcss()]` больше не нужен.
  modules: ["@nuxt/ui"],

  // Бэкенд (Fastify) живёт отдельным приложением в ../backend.
  // Порог задаётся переменной BACKEND_PORT, по умолчанию 3001.
  routeRules: {
    "/api/**": {
      proxy: `http://localhost:${env.BACKEND_PORT ?? 3001}/api/**`,
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

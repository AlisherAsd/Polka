// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // @nuxt/ui v4 сам подключает Tailwind (через @tailwindcss/vite),
  // поэтому собственный `vite.plugins: [tailwindcss()]` больше не нужен.
  modules: ["@nuxt/ui"],

  // Только сервер: ключ не попадает в клиентский бандл.
  // В .env переменная должна называться NUXT_OPENROUTER_KEY (или NITRO_OPENROUTER_KEY).
  runtimeConfig: {
    openrouterKey: "",
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

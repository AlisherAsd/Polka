/** Ключ OpenRouter и статус премиума нужны до первого запроса к ИИ. */
export default defineNuxtPlugin(() => {
  useAiKey().init()
})

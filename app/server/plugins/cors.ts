/**
 * CORS для `/api/**`: API вызывается не только со страниц этого же воркера,
 * но и из внешних клиентов (нативное приложение на Capacitor, отдельный хост).
 *
 * `CORS_ORIGINS` — список через запятую. По умолчанию разрешены локальные
 * адреса Capacitor/WebView и dev-сервер. Запросы без `Origin` (curl, серверные
 * вызовы, SSR) не трогаем.
 */
const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost',
  'https://localhost',
  // Оболочки нативного приложения. macOS/Tauri отдаёт `tauri://localhost`,
  // Windows и Android — `http(s)://tauri.localhost`, Capacitor — свой scheme.
  // Никогда не отвечаем `*`: с credentials это запрещено браузером.
  'capacitor://localhost',
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
]

/**
 * Переменная окружения воркера. В Nitro-типах `process` нет (у воркера нет
 * `@types/node`), поэтому читаем через `globalThis`.
 */
function envOf(name: string): string | undefined {
  const nodeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process

  return nodeProcess?.env?.[name]
}

function allowedOrigins(raw: string | undefined): string[] {
  const list = String(raw ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return list.length > 0 ? list : DEFAULT_ORIGINS
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const path = event.path ?? ''

    if (!path.startsWith('/api/')) {
      return
    }

    const origin = getHeader(event, 'origin')
    const allowed = allowedOrigins(envOf('CORS_ORIGINS'))
    const permitted = origin && allowed.includes(origin) ? origin : ''

    if (permitted) {
      setHeader(event, 'access-control-allow-origin', permitted)
      setHeader(event, 'vary', 'Origin')
      setHeader(event, 'access-control-allow-credentials', 'true')
    }

    setHeader(event, 'access-control-allow-methods', 'GET,POST,PATCH,DELETE,OPTIONS')
    // Клиент присылает ещё `x-openrouter-key` (личный ключ ИИ) — разрешаем всё,
    // что он перечислит в preflight, иначе браузер/WebView режет запрос.
    const requested = getHeader(event, 'access-control-request-headers') || 'content-type,authorization,x-openrouter-key'

    setHeader(event, 'access-control-allow-headers', requested)
    setHeader(event, 'access-control-max-age', 86400)

    // Preflight отвечаем сразу, не доходя до роутов.
    if (event.method === 'OPTIONS') {
      event.node.res.statusCode = 204
      event.node.res.setHeader('content-length', '0')
      event.node.res.end()
    }
  })
})

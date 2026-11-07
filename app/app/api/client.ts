/**
 * Единый клиент API.
 *
 * База берётся из `runtimeConfig.public.apiBase` (она же `NUXT_PUBLIC_API_BASE`):
 * пусто — тот же origin (сайт с Nitro-ручками), иначе — внешний адрес
 * (`https://api.<домен>` для нативного приложения / отдельного деплоя API).
 *
 * Все запросы к бэкенду должны идти через этот модуль: только так натив
 * и «сайт на другом origin» попадут в нужный хост.
 */

/** Ответ `$fetch`-ошибки с телом `{ message }`. */
function messageOf(error: unknown, fallback: string): string {
  const message = (error as { data?: { message?: unknown } })?.data?.message

  return typeof message === 'string' && message.length > 0 ? message : fallback
}

/**
 * База API.
 *
 * Пустая строка — тот же origin: так работает и локальный dev (Nitro-ручки на
 * `localhost:3000`), и веб в проде (воркер вместе с `/api`).
 *
 * Внешний адрес нужен только статике (нативное приложение): он приходит из
 * `NUXT_PUBLIC_API_BASE` при сборке — см. `npm run desktop:web`. Никаких
 * зашитых адресов в коде нет: если статику собрали без переменной, запрос
 * пойдёт в `tauri://`/`file://` и упадёт — это заметно сразу, а не тихо
 * уводит локальную разработку в прод.
 */
export function useApiBase(): string {
  // `useRuntimeConfig()` работает и в setup, и в плагинах; `window.__NUXT__`
  // читаем как запасной путь для ранних вызовов до инициализации Nuxt.
  const runtime = String(useRuntimeConfig().public?.apiBase ?? '')

  if (runtime) {
    return runtime.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined') {
    const globalConfig = (window as unknown as { __NUXT__?: { config?: { public?: { apiBase?: unknown } } } })
      .__NUXT__?.config?.public?.apiBase

    if (typeof globalConfig === 'string' && globalConfig.length > 0) {
      return globalConfig.replace(/\/+$/, '')
    }
  }

  // Пусто — тот же origin (dev и веб).
  return ''
}

/** Собирает абсолютный URL: пустая база — тот же origin. */
export function apiUrl(base: string, path: string): string {
  return `${String(base ?? '').replace(/\/+$/, '')}${path}`
}

type FetchOptions = Record<string, unknown>

/** `$fetch` без типизированных маршрутов: путь приходит динамическим. */
const rawFetch = $fetch as unknown as (url: string, options?: FetchOptions) => Promise<unknown>

/** База API: пустая строка — тот же origin. */
export type ApiBase = string

/** Ключ токена натива (дублирует httpOnly cookie для WebView). */
const TOKEN_KEY = 'polka-token'

/** Личный ключ OpenRouter (localStorage); уходит только в заголовке. */
const AI_KEY = 'polka-openrouter-key'

/** Токен, сохранённый при входе в нативном приложении. */
export function storedToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/** Ключ OpenRouter из localStorage — для заголовка `X-OpenRouter-Key`. */
export function storedAiKey(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const value = window.localStorage.getItem(AI_KEY)

    return value && value.length > 0 ? value : null
  } catch {
    return null
  }
}

/**
 * Запрос к API относительно базы.
 *
 * Cookie-сессия сайта уходит сама (`credentials` не отключаем); для натива
 * добавляем `Authorization: Bearer`, если токен сохранён после входа,
 * и личный ключ ИИ в `X-OpenRouter-Key` (если пользователь его ввёл).
 */
export async function apiFetch<T>(
  base: ApiBase,
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const token = storedToken()
  const aiKey = storedAiKey()
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) }

  if (token) {
    headers.authorization = `Bearer ${token}`
  }

  if (aiKey) {
    headers['x-openrouter-key'] = aiKey
  }


  return (await rawFetch(apiUrl(base, path), { ...options, headers })) as T
}

export { messageOf as apiErrorMessage }

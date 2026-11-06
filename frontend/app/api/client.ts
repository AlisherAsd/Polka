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

/** Читает базу API из Nuxt runtime config (вызывать внутри setup/composable). */
export function useApiBase(): string {
  const config = useRuntimeConfig()

  return String(config.public.apiBase ?? '').replace(/\/+$/, '')
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

/**
 * Запрос к API относительно базы.
 *
 * Cookie-сессия сайта уходит сама (`credentials` не отключаем); для натива
 * добавляем `Authorization: Bearer`, если токен сохранён после входа.
 */
export async function apiFetch<T>(
  base: ApiBase,
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const token = storedToken()
  const headers = (options.headers ?? {}) as Record<string, string>

  return (await rawFetch(apiUrl(base, path), {
    ...options,
    headers: token ? { authorization: `Bearer ${token}`, ...headers } : headers,
  })) as T
}

export { messageOf as apiErrorMessage }

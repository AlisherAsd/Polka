import { apiFetch, useApiBase } from '~/api/client'

/**
 * Аутентификация: сессия на сервере (`/api/auth/*`), токен — в httpOnly cookie
 * для сайта и в `Authorization: Bearer` для нативного приложения.
 *
 * Владение данными пока не проверяется: вход ограничивает только функции на
 * фронте (чат, папки, «Суммировать ИИ»).
 */
export interface AuthUser {
  id: string
  email: string
  /** Премиум: запросы к ИИ идут серверным ключом. */
  isPremium: boolean
  createdAt: string
}

interface AuthResponse {
  user: AuthUser
  token?: string
  expiresAt?: string
}

/** Токен натива: в WebView cookie переживает не всегда, поэтому дублируем его. */
const TOKEN_KEY = 'polka-token'

function readStoredToken(): string | null {
  if (!import.meta.client) {
    return null
  }

  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function storeToken(token: string | null): void {
  if (!import.meta.client) {
    return
  }

  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token)
    } else {
      window.localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // Приватный режим — остаёмся на cookie.
  }
}

export function useAuth() {
  const apiBase = useApiBase()
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loaded = useState<boolean>('auth-loaded', () => false)
  const isAuth = computed<boolean>(() => user.value !== null)

  /** Заголовок авторизации для натива (на сайте токена в JS нет — только cookie). */
  function authHeaders(): Record<string, string> {
    const token = readStoredToken()

    return token ? { authorization: `Bearer ${token}` } : {}
  }

  /** Подтягивает пользователя по сессии. Ошибка 401 — это «не вошёл», не ошибка. */
  async function fetchMe(): Promise<void> {
    if (!import.meta.client) {
      return
    }

    try {
      const res = await apiFetch<{ user: AuthUser }>(apiBase, '/api/auth/me', {
        headers: authHeaders(),
      })

      user.value = res.user
      loaded.value = true
    } catch {
      user.value = null
      loaded.value = true
      storeToken(null)
    }
  }

  /** Инициализация один раз за вкладку. */
  async function init(): Promise<void> {
    if (!import.meta.client || loaded.value) {
      return
    }

    await fetchMe()
  }

  /**
   * После успешного входа/регистрации: сохраняем токен натива (если сервер его
   * вернул) и пользователя. Cookie уже выставлена ответом.
   */
  async function signInRequest(path: '/api/auth/login' | '/api/auth/register', email: string, password: string): Promise<AuthUser> {
    const res = await apiFetch<AuthResponse>(apiBase, path, {
      method: 'POST',
      body: { email, password },
    })

    if (res.token) {
      storeToken(res.token)
    }

    user.value = res.user
    loaded.value = true

    return res.user
  }

  /** Выход: сервер убивает сессию, локально чистим токен и состояние. */
  async function signOut(): Promise<void> {
    try {
      await apiFetch(apiBase, '/api/auth/logout', {
        method: 'POST',
        headers: authHeaders(),
      })
    } finally {
      storeToken(null)
      user.value = null
    }
  }

  /** Мок-флаг больше не нужен, оставлен для совместимости старых вызовов. */
  function signIn(): void {
    void fetchMe()
  }

  return { user, isAuth, init, fetchMe, signInRequest, signOut, signIn, authHeaders }
}

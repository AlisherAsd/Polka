import { apiFetch, useApiBase } from '~/api/client'
import type { AuthUser } from '~/composables/useAuth'

/**
 * Личный ключ OpenRouter и премиум-статус.
 *
 * Ключ пользователя живёт только в localStorage браузера/WebView и уходит
 * на сервер исключительно заголовком `X-OpenRouter-Key` в момент запроса —
 * в D1 он не сохраняется. Премиум-пользователи ходят серверным ключом.
 */
const KEY_STORAGE = 'polka-openrouter-key'

export function useAiKey() {
  const apiBase = useApiBase()
  const notify = useNotify()
  const { user, isAuth, fetchMe } = useAuth()

  const key = useState<string>('ai-openrouter-key', () => '')
  const loaded = useState<boolean>('ai-openrouter-key-loaded', () => false)
  const pending = useState<boolean>('ai-premium-pending', () => false)

  const isPremium = computed<boolean>(() => user.value?.isPremium === true)

  /** Может ли пользователь пользоваться ИИ: премиум или свой ключ. */
  const canUseAi = computed<boolean>(() => isPremium.value || key.value.length > 0)

  /** Маска ключа для UI: `sk-or-v1-…ab12`. */
  const maskedKey = computed<string>(() => {
    const value = key.value

    if (value.length === 0) {
      return ''
    }

    return value.length <= 12 ? '••••' : `${value.slice(0, 8)}…${value.slice(-4)}`
  })

  function readStored(): string {
    if (!import.meta.client) {
      return ''
    }

    try {
      return window.localStorage.getItem(KEY_STORAGE) ?? ''
    } catch {
      return ''
    }
  }

  function writeStored(value: string): void {
    if (!import.meta.client) {
      return
    }

    try {
      if (value) {
        window.localStorage.setItem(KEY_STORAGE, value)
      } else {
        window.localStorage.removeItem(KEY_STORAGE)
      }
    } catch {
      // Приватный режим: ключ проживёт только до перезагрузки.
    }
  }

  /** Подтягивает ключ из localStorage один раз за вкладку. */
  function init(): void {
    if (loaded.value) {
      return
    }

    key.value = readStored()
    loaded.value = true
  }

  /** Проверяет ключ на сервере (`/api/auth/key`) и сохраняет в localStorage. */
  async function saveKey(value: string): Promise<void> {
    const trimmed = value.trim()

    await apiFetch(apiBase, '/api/auth/key', {
      method: 'POST',
      body: { key: trimmed },
    })

    key.value = trimmed
    writeStored(trimmed)
    notify.success('Ключ сохранён на этом устройстве')
  }

  /** Убирает ключ с устройства. */
  function removeKey(): void {
    key.value = ''
    writeStored('')
    notify.success('Ключ удалён с этого устройства')
  }

  /** «Купить премиум»: пока просто включает флаг на сервере. */
  async function buyPremium(): Promise<void> {
    if (!isAuth.value) {
      throw new Error('Сначала войдите в аккаунт')
    }

    if (pending.value) {
      return
    }

    pending.value = true

    try {
      await apiFetch(apiBase, '/api/auth/premium', { method: 'POST' })
      await fetchMe()
      notify.success('Премиум активирован: ИИ работает без своего ключа')
    } finally {
      pending.value = false
    }
  }

  return {
    key,
    maskedKey,
    isPremium,
    canUseAi,
    pending,
    init,
    saveKey,
    removeKey,
    buyPremium,
  }
}

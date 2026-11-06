/**
 * Проверка мобильного viewport на клиенте.
 *
 * Порог совпадает с брейкпоинтом `sm` Tailwind и мобильной веткой layout.
 * На сервере всегда `false` — разметка от этого не зависит.
 */
const MOBILE_QUERY = '(max-width: 39.9375rem)'

export function isMobileViewport(): boolean {
  if (!import.meta.client || typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(MOBILE_QUERY).matches
}

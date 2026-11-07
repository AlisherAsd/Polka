/**
 * Платформенные мелочи для веба и нативного приложения (Tauri).
 */

/** Приложение запущено внутри Tauri WebView, а не в браузере. */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const candidate = window as unknown as {
    __TAURI_INTERNALS__?: unknown
    __TAURI__?: unknown
  }

  return Boolean(candidate.__TAURI_INTERNALS__ ?? candidate.__TAURI__)
}

/**
 * Копирует текст в буфер обмена.
 *
 * В обычном браузере работает Clipboard API, но в WKWebView нативного
 * приложения он может быть недоступен — тогда используем старый
 * `execCommand('copy')` через скрытый textarea.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)

      return true
    } catch {
      // Ниже — запасной путь.
    }
  }

  if (typeof document === 'undefined') {
    return false
  }

  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '0'
    area.style.left = '0'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(area)

    return copied
  } catch {
    return false
  }
}

/**
 * Публичный адрес ссылки: в вебе — текущий origin, в нативе — адрес API
 * (`https://...workers.dev`), иначе получается `tauri://localhost/...`,
 * по которому никто, кроме этого приложения, ничего не откроет.
 */
export function publicShareUrl(apiBase: string, url: string): string {
  const base = String(apiBase ?? '').replace(/\/+$/, '')
  const origin = base.length > 0
    ? base
    : (typeof window !== 'undefined' ? window.location.origin : '')

  return `${origin}${url}`
}

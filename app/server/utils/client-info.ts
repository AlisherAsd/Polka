/**
 * Платформа запроса — только для логов и отладки.
 *
 * Никакие права и решения по этому признаку не выдаются: авторизация
 * определяется исключённо токеном (`Authorization: Bearer` или cookie).
 * Значение берётся из `Origin`, а не из тела запроса — тело клиент может
 * подделать, `Origin` ставит сам WebView/браузер.
 */
import type { H3Event } from 'h3'

export type ClientPlatform = 'web' | 'tauri' | 'capacitor' | 'unknown'

/** Платформа по origin: `tauri://localhost`, `https://tauri.localhost`, `capacitor://localhost`. */
export function clientPlatform(event: H3Event): ClientPlatform {
  const origin = getHeader(event, 'origin') ?? ''

  if (origin.startsWith('tauri://') || origin.includes('tauri.localhost')) {
    return 'tauri'
  }

  if (origin.startsWith('capacitor://')) {
    return 'capacitor'
  }

  if (origin.startsWith('http://') || origin.startsWith('https://')) {
    return 'web'
  }

  return 'unknown'
}

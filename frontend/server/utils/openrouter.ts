// Обёртка над OpenRouter для Nitro-роутов. Ключ приходит секретом воркера.
import type { H3Event } from 'h3'

/** Модель зафиксирована. */
export const MODEL = 'openrouter/free'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Заголовок с ключом пользователя (живёт только в localStorage клиента). */
export const USER_KEY_HEADER = 'x-openrouter-key'

/** Серверный ключ: секрет `OPENROUTER_KEY` воркера или env при локальном запуске. */
export function serverKey(event: H3Event): string {
  const envKey = (event.context.cloudflare as { env?: { OPENROUTER_KEY?: string } } | undefined)
    ?.env?.OPENROUTER_KEY
  const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env?.OPENROUTER_KEY

  return String(envKey || nodeEnv || '').trim()
}

/** Ключ из заголовка запроса (свой ключ пользователя). */
export function userKey(event: H3Event): string {
  return String(getHeader(event, USER_KEY_HEADER) ?? '').trim()
}

/**
 * Какой ключ использовать для запроса к модели:
 *   * премиум — серверный ключ из `OPENROUTER_KEY`;
 *   * иначе — ключ, присланный клиентом в заголовке `X-OpenRouter-Key`.
 * Без ключа — 402, чтобы фронт показал «свой ключ или подписка».
 */
export function resolveKey(event: H3Event, isPremium: boolean): { key: string; source: 'server' | 'user' } {
  if (isPremium) {
    const key = serverKey(event)

    if (key) {
      return { key, source: 'server' }
    }

    // Премиум без серверного ключа — не тупик: пусть работает со своим.
  }

  const personal = userKey(event)

  if (personal) {
    return { key: personal, source: 'user' }
  }

  throw createError({
    statusCode: 402,
    message: 'Доступ к ИИ закрыт: укажите свой ключ OpenRouter или оформите премиум',
  })
}

/** Проверка ключа реальным запросом к OpenRouter (`/key` — самый дешёвый способ). */
export async function checkKey(key: string): Promise<boolean> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${key}` },
    })

    return res.ok
  } catch {
    return false
  }
}

/** Запрос к модели. Возвращает текст ответа. */
export async function chat(
  event: H3Event,
  messages: ChatMessage[],
  options: { isPremium?: boolean } = {},
): Promise<string> {
  const { key } = resolveKey(event, options.isPremium === true)

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, messages }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')

    throw createError({
      statusCode: 502,
      message: `Ошибка OpenRouter (${res.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`,
    })
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }

  return data.choices?.[0]?.message?.content ?? ''
}

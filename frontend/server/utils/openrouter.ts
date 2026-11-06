// Обёртка над OpenRouter для Nitro-роутов. Ключ приходит секретом воркера.
import type { H3Event } from 'h3'

/** Модель зафиксирована. */
export const MODEL = 'openrouter/free'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Ключ воркера: секрет `OPENROUTER_KEY` (или env при локальном запуске). */
function requireKey(event: H3Event): string {
  const envKey = (event.context.cloudflare as { env?: { OPENROUTER_KEY?: string } } | undefined)
    ?.env?.OPENROUTER_KEY
  const key = String(envKey || process.env.OPENROUTER_KEY || '')

  if (!key) {
    throw createError({ statusCode: 500, message: 'Ключ API не найден' })
  }

  return key
}

/** Запрос к модели. Возвращает текст ответа. */
export async function chat(event: H3Event, messages: ChatMessage[]): Promise<string> {
  const key = requireKey(event)

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

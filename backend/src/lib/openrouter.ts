// Обёртка над OpenRouter. Ключ живёт только здесь, на сервере.

/** Модель зафиксирована. */
export const MODEL = 'openrouter/free'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Ошибка с HTTP-статусом, которую понимает errorHandler в server.ts. */
export class HttpError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

/** Возвращает ключ или бросает 500 — как в прежних Nuxt-роутах. */
function requireKey(): string {
  const key = String(process.env.OPENROUTER_KEY || '')

  if (!key) {
    throw new HttpError(500, 'Ключ API не найден')
  }

  return key
}

/** Запрос к модели. Возвращает текст ответа. */
export async function chat(messages: ChatMessage[]): Promise<string> {
  const key = requireKey()

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
    throw new HttpError(502, `Ошибка OpenRouter (${res.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`)
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }

  return data.choices?.[0]?.message?.content ?? ''
}

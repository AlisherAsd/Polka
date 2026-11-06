// Чат с моделью OpenRouter. История хранится в памяти сервера (сессия).
import { defineEventHandler, readBody, createError } from 'h3'

/** Модель зафиксирована. */
const MODEL = 'openrouter/free'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * История текущей сессии. Одна общая на инстанс — для теста этого достаточно.
 */
const history: ChatMessage[] = []

export default defineEventHandler(async (event) => {
  const body = await readBody<{ prompt?: string }>(event)
  const prompt = (body.prompt ?? '').trim()

  if (prompt.length === 0) {
    throw createError({ statusCode: 400, message: 'Пустой промпт' })
  }

  const config = useRuntimeConfig()
  const key = String(config.openrouterKey || '')

  if (!key) {
    throw createError({ statusCode: 500, message: 'Ключ API не найден' })
  }

  history.push({ role: 'user', content: prompt })

  const res = await $fetch<{ choices: { message: { content: string } }[] }>(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: { model: MODEL, messages: history },
    },
  )

  const answer = res.choices[0]?.message.content ?? ''

  history.push({ role: 'assistant', content: answer })

  return { text: answer }
})

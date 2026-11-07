// POST /api/ask — чат с моделью OpenRouter.
// История хранится в памяти изолята (сессия): для прототипа этого достаточно.
import { chat, type ChatMessage } from '../utils/openrouter'
import { userFromEvent } from '../utils/session'

const history: ChatMessage[] = []

export default defineEventHandler(async (event) => {
  const body = (await readBody<{ prompt?: string }>(event)) ?? {}
  const prompt = (body.prompt ?? '').trim()

  if (prompt.length === 0) {
    throw createError({ statusCode: 400, message: 'Пустой промпт' })
  }

  history.push({ role: 'user', content: prompt })

  // Премиум использует серверный ключ, остальные — свой из заголовка.
  const account = await userFromEvent(event)
  const answer = await chat(event, history, { isPremium: Boolean(account?.is_premium) })

  history.push({ role: 'assistant', content: answer })

  return { text: answer }
})

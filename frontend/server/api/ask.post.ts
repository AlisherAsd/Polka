// POST /api/ask — чат с моделью OpenRouter.
// История хранится в памяти изолята (сессия): для прототипа этого достаточно.
import { chat, type ChatMessage } from '../utils/openrouter'

const history: ChatMessage[] = []

export default defineEventHandler(async (event) => {
  const body = (await readBody<{ prompt?: string }>(event)) ?? {}
  const prompt = (body.prompt ?? '').trim()

  if (prompt.length === 0) {
    throw createError({ statusCode: 400, message: 'Пустой промпт' })
  }

  history.push({ role: 'user', content: prompt })

  const answer = await chat(event, history)

  history.push({ role: 'assistant', content: answer })

  return { text: answer }
})

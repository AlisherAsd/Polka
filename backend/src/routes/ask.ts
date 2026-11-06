// Чат с моделью OpenRouter. История хранится в памяти сервера (сессия).
import type { FastifyPluginAsync } from 'fastify'
import { chat, HttpError, type ChatMessage } from '../lib/openrouter.ts'

/**
 * История текущей сессии. Одна общая на инстанс — для прототипа этого достаточно.
 */
const history: ChatMessage[] = []

export const askRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { prompt?: string } }>('/api/ask', async (request) => {
    const prompt = (request.body?.prompt ?? '').trim()

    if (prompt.length === 0) {
      throw new HttpError(400, 'Пустой промпт')
    }

    history.push({ role: 'user', content: prompt })

    const answer = await chat(history)

    history.push({ role: 'assistant', content: answer })

    return { text: answer }
  })
}

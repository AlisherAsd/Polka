// Суммирование выбранных карточек через модель OpenRouter.
import type { FastifyPluginAsync } from 'fastify'
import { chat, HttpError } from '../lib/openrouter.ts'

interface CardPayload {
  title?: string
  description?: string
  url?: string
  authorName?: string
}

/** Собирает текстовый контекст из карточек. */
function buildContext(cards: readonly CardPayload[]): string {
  return cards
    .map((card, index) => {
      const lines = [`${index + 1}. ${card.title || 'Без названия'}`]

      if (card.authorName) {
        lines.push(`   Автор: ${card.authorName}`)
      }

      if (card.description) {
        lines.push(`   Описание: ${card.description}`)
      }

      if (card.url) {
        lines.push(`   Ссылка: ${card.url}`)
      }

      return lines.join('\n')
    })
    .join('\n\n')
}

export const summarizeRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { prompt?: string; cards?: CardPayload[] } }>(
    '/api/summarize',
    async (request) => {
      const prompt = (request.body?.prompt ?? '').trim()
      const cards = Array.isArray(request.body?.cards) ? request.body.cards : []

      if (cards.length === 0) {
        throw new HttpError(400, 'Нет карточек для анализа')
      }

      const system =
        'Ты помощник по работе с сохранёнными ссылками. Тебе дают список карточек ' +
        '(заголовок, автор, описание, ссылка). Отвечай кратко и по делу на русском.'

      const user = [
        prompt.length > 0 ? `Задача: ${prompt}` : 'Задача: суммируй содержимое карточек.',
        '',
        `Карточки (${cards.length}):`,
        buildContext(cards),
      ].join('\n')

      const text = await chat([
        { role: 'system', content: system },
        { role: 'user', content: user },
      ])

      return { text }
    },
  )
}

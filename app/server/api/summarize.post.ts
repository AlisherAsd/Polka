// POST /api/summarize — суммаризация карточек через OpenRouter.
// Саммари не сохраняется само: решение, в какую папку положить файл,
// принимает пользователь на клиенте (после ответа модели).
import { chat } from '../utils/openrouter'
import { userFromEvent } from '../utils/session'

interface CardPayload {
  /** id карточки (`items.id`) — тогда саммари привязывается к ней. */
  id?: string
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

export default defineEventHandler(async (event) => {
  const body = (await readBody<{
    prompt?: string
    cards?: CardPayload[]
  }>(event)) ?? {}
  const prompt = (body.prompt ?? '').trim()
  const cards = Array.isArray(body.cards) ? body.cards : []

  if (cards.length === 0) {
    throw createError({ statusCode: 400, message: 'Нет карточек для анализа' })
  }

  const system =
    'Ты помощник по работе с сохранёнными ссылками. Тебе дают список карточек ' +
    '(заголовок, автор, описание, ссылка). Отвечай кратко и по делу на русском.'

  const userMessage = [
    prompt.length > 0 ? `Задача: ${prompt}` : 'Задача: суммируй содержимое карточек.',
    '',
    `Карточки (${cards.length}):`,
    buildContext(cards),
  ].join('\n')

  // Премиум использует серверный ключ, остальные — свой из заголовка.
  const account = await userFromEvent(event)
  const text = await chat(event, [
    { role: 'system', content: system },
    { role: 'user', content: userMessage },
  ], { isPremium: Boolean(account?.is_premium) })

  return { text }
})

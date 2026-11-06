// Суммирование выбранных карточек через модель OpenRouter.
import { defineEventHandler, readBody, createError } from 'h3'

const MODEL = 'openrouter/free'

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

export default defineEventHandler(async (event) => {
  const body = await readBody<{ prompt?: string; cards?: CardPayload[] }>(event)
  const prompt = (body.prompt ?? '').trim()
  const cards = Array.isArray(body.cards) ? body.cards : []

  if (cards.length === 0) {
    throw createError({ statusCode: 400, message: 'Нет карточек для анализа' })
  }

  const config = useRuntimeConfig()
  const key = String(config.openrouterKey || '')

  if (!key) {
    throw createError({ statusCode: 500, message: 'Ключ API не найден' })
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

  const res = await $fetch<{ choices: { message: { content: string } }[] }>(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      },
    },
  )

  return { text: res.choices[0]?.message.content ?? '' }
})

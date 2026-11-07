// POST /api/summarize — суммаризация карточек через OpenRouter.
// По умолчанию саммари сохраняется заметкой в папку `ai-voult`.
import { chat } from '../utils/openrouter'
import { userFromEvent } from '../utils/session'
import { AI_FOLDER_ID, createNote, ensureAiFolder, toNote, type Note, type NoteRow } from '../utils/notes'
import { optionalText } from '../utils/items'

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
    /** `false` — не создавать заметку в `ai-voult`. */
    save?: boolean
    /** id карточки, если фронт присылает одну карточку массивом без id. */
    itemId?: string
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
  const ownerId = account?.id ?? null
  const text = await chat(event, [
    { role: 'system', content: system },
    { role: 'user', content: userMessage },
  ], { isPremium: Boolean(account?.is_premium) })

  if (!text.trim()) {
    return { text, note: null }
  }

  // Саммари складывается заметкой в служебную папку `ai-voult`.
  let note: Note | null = null

  if (body.save !== false) {
    try {
      const db = dbOf(event)

      await ensureAiFolder(db)

      const single = cards.length === 1 ? cards[0] : undefined
      const itemId = optionalText(body.itemId) ?? optionalText(single?.id) ?? null
      const first = cards[0]

      // Карточка → файл-карточка в `ai-voult`: название, саммари, ссылка на исходник.
      const title = `${optionalText(first?.title) ?? 'Саммари'} — саммари`
      const source = optionalText(first?.url)
      const content = source ? `${text.trim()}\n\nИсточник: ${source}` : text.trim()

      // Повторная суммаризация той же карточки обновляет её файл, а не плодит копии.
      // Ищем файл саммари только среди заметок этого пользователя.
      const existing = itemId
        ? await db.first<{ id: string }>(
          `SELECT id FROM notes WHERE item_id = ? AND folder_id = ? AND ${ownerId ? 'user_id = ?' : 'user_id IS NULL'}`,
          itemId,
          AI_FOLDER_ID,
          ...(ownerId ? [ownerId] : []),
        )
        : null

      if (existing) {
        const updatedAt = new Date().toISOString()

        await db.run(
          'UPDATE notes SET title = ?, content = ?, url = ?, updated_at = ? WHERE id = ?',
          title,
          content,
          source ?? null,
          updatedAt,
          existing.id,
        )

        const row = await db.first<NoteRow>('SELECT * FROM notes WHERE id = ?', existing.id)

        note = row ? toNote(row) : null
      } else {
        note = await createNote(db, {
          title,
          content,
          folderId: AI_FOLDER_ID,
          itemId,
          url: source ?? null,
          userId: ownerId,
        })
      }
    } catch (error) {
      // Саммари уже получено — не роняем ответ из-за сохранения заметки.
      console.error('Не удалось сохранить саммари в ai-voult', error)
    }
  }

  return { text, note }
})

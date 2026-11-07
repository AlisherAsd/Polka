// POST /api/items — создание карточки.
import { getDatabase } from '../../utils/db'
import { optionalText, parseType, parseUrl, type Item, type ItemBody } from '../../utils/items'
import { currentUserId } from '../../utils/scope'

export default defineEventHandler(async (event) => {
  const body = (await readBody<ItemBody>(event)) ?? {}
  const type = parseType(body.type) ?? 'article'
  const url = parseUrl(body.url, type)
  const now = new Date().toISOString()

  const item: Item = {
    id: crypto.randomUUID(),
    type,
    title: optionalText(body.title) ?? url ?? 'Без названия',
    createdAt: now,
    updatedAt: now,
  }

  if (url) {
    item.url = url
  }

  const thumbnail = optionalText(body.thumbnail)
  const summary = optionalText(body.summary)
  // `content` — транскрипт/текст: сохраняем как есть, пустую строку не отсекаем.
  const content = typeof body.content === 'string' ? body.content : undefined
  const fileId = optionalText(body.fileId)

  if (thumbnail) {
    item.thumbnail = thumbnail
  }

  if (summary) {
    item.summary = summary
  }

  if (content !== undefined) {
    item.content = content
  }

  if (fileId) {
    item.fileId = fileId
  }

  const db = getDatabase(event)
  const userId = await currentUserId(event)

  await db.run(
    `INSERT INTO items (id, type, url, title, thumbnail, summary, content, file_id, created_at, updated_at, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id,
    item.type,
    item.url ?? null,
    item.title,
    item.thumbnail ?? null,
    item.summary ?? null,
    item.content ?? null,
    item.fileId ?? null,
    item.createdAt,
    item.updatedAt,
    userId,
  )

  setResponseStatus(event, 201)

  return { item }
})

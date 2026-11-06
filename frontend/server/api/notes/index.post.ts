// POST /api/notes — создать заметку (в том числе «привязанную» к карточке).
// Тело: { title, content, folderId?, itemId?, url? }.
import { folderExists, toNote, type NoteRow } from '../../utils/notes'
import { optionalText } from '../../utils/items'

export default defineEventHandler(async (event) => {
  const body = (await readBody<Record<string, unknown>>(event)) ?? {}
  const title = optionalText(body.title)
  const content = typeof body.content === 'string' ? body.content : ''
  const folderId = optionalText(body.folderId) ?? null
  const itemId = optionalText(body.itemId) ?? null
  const url = optionalText(body.url) ?? null

  if (!title) {
    throw createError({ statusCode: 400, message: 'Не указано название заметки' })
  }

  if (content.trim().length === 0) {
    throw createError({ statusCode: 400, message: 'Пустая заметка' })
  }

  const db = dbOf(event)

  if (folderId && !(await folderExists(db, folderId))) {
    throw createError({ statusCode: 404, message: 'Папка не найдена' })
  }

  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  await db.run(
    `INSERT INTO notes (id, folder_id, item_id, title, content, url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    folderId,
    itemId,
    title,
    content,
    url,
    now,
    now,
  )

  const row = await db.first<NoteRow>('SELECT * FROM notes WHERE id = ?', id)

  setResponseStatus(event, 201)

  return { note: row ? toNote(row) : null }
})

// PATCH /api/notes/:id — редактирование заметки: title, content, folderId.
import { folderExists, toNote, type NoteRow } from '../../utils/notes'
import { optionalText } from '../../utils/items'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const body = (await readBody<Record<string, unknown>>(event)) ?? {}
  const db = dbOf(event)

  const current = await db.first<NoteRow>('SELECT * FROM notes WHERE id = ?', id)

  if (!current) {
    throw createError({ statusCode: 404, message: 'Заметка не найдена' })
  }

  const sets: string[] = []
  const values: unknown[] = []

  if ('title' in body) {
    const title = optionalText(body.title)

    if (!title) {
      throw createError({ statusCode: 400, message: 'Не указано название заметки' })
    }

    sets.push('title = ?')
    values.push(title)
  }

  if ('content' in body) {
    const content = typeof body.content === 'string' ? body.content : ''

    if (content.trim().length === 0) {
      throw createError({ statusCode: 400, message: 'Пустая заметка' })
    }

    sets.push('content = ?')
    values.push(content)
  }

  if ('folderId' in body) {
    const folderId = optionalText(body.folderId) ?? null

    if (folderId && !(await folderExists(db, folderId))) {
      throw createError({ statusCode: 404, message: 'Папка не найдена' })
    }

    sets.push('folder_id = ?')
    values.push(folderId)
  }

  if (sets.length === 0) {
    return { note: toNote(current) }
  }

  sets.push('updated_at = ?')
  values.push(new Date().toISOString(), id)

  await db.run(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, ...values)

  const row = await db.first<NoteRow>('SELECT * FROM notes WHERE id = ?', id)

  return { note: row ? toNote(row) : null }
})

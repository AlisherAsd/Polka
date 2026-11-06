// GET /api/notes/:id — одна заметка (страница /note/:id).
import { toNote, type NoteRow } from '../../utils/notes'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const db = dbOf(event)
  const row = await db.first<NoteRow>('SELECT * FROM notes WHERE id = ?', id)

  if (!row) {
    throw createError({ statusCode: 404, message: 'Заметка не найдена' })
  }

  return { note: toNote(row) }
})

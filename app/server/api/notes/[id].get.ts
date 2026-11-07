// GET /api/notes/:id — одна заметка (страница /note/:id).
import { toNote, type NoteRow } from '../../utils/notes'
import { scopeFor } from '../../utils/scope'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const db = dbOf(event)
  const scope = await scopeFor(event)
  const row = await db.first<NoteRow>(
    `SELECT * FROM notes WHERE id = ? AND ${scope.sql}`,
    id,
    ...scope.params,
  )

  if (!row) {
    throw createError({ statusCode: 404, message: 'Заметка не найдена' })
  }

  return { note: toNote(row) }
})

// GET /api/notes — заметки. Опционально `?folderId=ai-voult` и `?itemId=<карточка>`.
import { toNote, type NoteRow } from '../../utils/notes'
import { scopeFor } from '../../utils/scope'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const folderId = typeof query.folderId === 'string' ? query.folderId.trim() : ''
  const itemId = typeof query.itemId === 'string' ? query.itemId.trim() : ''
  const db = dbOf(event)
  const scope = await scopeFor(event)

  const conditions: string[] = [scope.sql]
  const params: unknown[] = [...scope.params]

  if (folderId) {
    conditions.push('folder_id = ?')
    params.push(folderId)
  }

  if (itemId) {
    conditions.push('item_id = ?')
    params.push(itemId)
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''
  const rows = await db.all<NoteRow>(
    `SELECT * FROM notes${where} ORDER BY created_at DESC`,
    ...params,
  )


  return { notes: rows.map(toNote) }
})

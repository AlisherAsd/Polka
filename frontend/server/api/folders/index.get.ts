// GET /api/folders — папки базы знаний (по умолчанию есть только `ai-voult`).
import { ensureAiFolder, toFolder, type FolderRow } from '../../utils/notes'
import { scopeFor } from '../../utils/scope'

export default defineEventHandler(async (event) => {
  const db = dbOf(event)

  await ensureAiFolder(db)

  const scope = await scopeFor(event)
  const rows = await db.all<FolderRow>(
    `SELECT * FROM folders WHERE ${scope.sql} ORDER BY created_at ASC`,
    ...scope.params,
  )

  return { folders: rows.map(toFolder) }
})

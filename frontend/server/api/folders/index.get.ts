// GET /api/folders — папки базы знаний (по умолчанию есть только `ai-voult`).
import { ensureAiFolder, toFolder, type FolderRow } from '../../utils/notes'

export default defineEventHandler(async (event) => {
  const db = dbOf(event)

  await ensureAiFolder(db)

  const rows = await db.all<FolderRow>('SELECT * FROM folders ORDER BY created_at ASC')

  return { folders: rows.map(toFolder) }
})

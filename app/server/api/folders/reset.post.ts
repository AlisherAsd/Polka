// POST /api/folders/reset — вернуть папки к базовому состоянию:
// «Мои знания» + ai-voult, остальные (и подпапки) удаляются.
// Заметки не теряются — переезжают в «Мои знания».
import { getDatabase } from '../../utils/db'
import { currentUserId } from '../../utils/scope'
import { resetFoldersToBaseline, listFolders } from '../../utils/workspaces'
import { ensureUserAiFolder } from '../../utils/ai-folder'

export default defineEventHandler(async (event) => {
  const userId = await currentUserId(event)

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Нужен вход' })
  }

  const db = getDatabase(event)

  await ensureUserAiFolder(db, userId)
  await resetFoldersToBaseline(db, userId)

  return { folders: await listFolders(db, userId) }
})

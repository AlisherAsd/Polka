// POST /api/folders/reset — вернуть папки к базовому состоянию:
// остаётся только «Мои знания», остальные (и подпапки) удаляются.
// Заметки не теряются — переезжают в «Мои знания».
import { getDatabase } from '../../utils/db'
import { currentUserId } from '../../utils/scope'
import { resetFoldersToBaseline, listFolders } from '../../utils/workspaces'

export default defineEventHandler(async (event) => {
  const userId = await currentUserId(event)

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Нужен вход' })
  }

  const db = getDatabase(event)

  await resetFoldersToBaseline(db, userId)

  return { folders: await listFolders(db, userId) }
})

// GET /api/folders — папки верхнего уровня: всегда начинается с «Мои знания».
//
// Каждая верхняя папка имеет доску (`boardId`), поэтому клиент может открыть
// `/board/<folderId>` для любой из них.
import { getDatabase } from '../../utils/db'
import { ensureRootFolder, listFolders } from '../../utils/workspaces'
import { ensureUserAiFolder } from '../../utils/ai-folder'
import { currentUserId } from '../../utils/scope'
import { toFolder, type FolderRow } from '../../utils/notes'

export default defineEventHandler(async (event) => {
  const db = getDatabase(event)
  const userId = await currentUserId(event)

  // Гость: папок нет вовсе. Раньше сюда попадали «общие» папки, созданные
  // до привязки к пользователю (`user_id IS NULL`), из-за чего новый аккаунт
  // видел чужие папки, но не видел свою «Мои знания».
  if (!userId) {
    return { folders: [], hasRoot: false }
  }

  // Обе служебные папки создаются сразу: «Мои знания» и `ai-voult`.
  await ensureRootFolder(db, userId)
  await ensureUserAiFolder(db, userId)

  const folders = await listFolders(db, userId)

  return { folders, hasRoot: true }
})

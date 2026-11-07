// GET /api/folders — папки верхнего уровня: всегда начинается с «Мои знания».
//
// Каждая верхняя папка имеет доску (`boardId`), поэтому клиент может открыть
// `/board/<folderId>` для любой из них.
import { getDatabase } from '../../utils/db'
import { ensureRootFolder, listFolders } from '../../utils/workspaces'
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

  // «Мои знания» создаётся сразу: это корень дерева папок.
  await ensureRootFolder(db, userId)

  const folders = await listFolders(db, userId)

  return { folders, hasRoot: true }
})

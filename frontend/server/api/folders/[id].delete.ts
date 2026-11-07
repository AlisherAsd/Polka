// DELETE /api/folders/:id — удалить папку пользователя.
//
// Заметки папки не пропадают: у них `folder_id` становится NULL
// (`ON DELETE SET NULL`), то есть файлы переезжают в корень базы знаний.
// Служебную `ai-voult` удалить нельзя.
import { AI_FOLDER_ID } from '../../utils/notes'
import { dbOf } from '../../utils/notes'
import { scopeFor } from '../../utils/scope'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''

  if (id === AI_FOLDER_ID) {
    throw createError({ statusCode: 400, message: 'Служебную папку ai-voult удалить нельзя' })
  }

  const db = dbOf(event)
  const scope = await scopeFor(event)

  // Удаляем только свою папку: общие чужие не трогаем.
  if (!scope.userId) {
    throw createError({ statusCode: 401, message: 'Нужен вход' })
  }

  const existing = await db.first<{ id: string }>(
    'SELECT id FROM folders WHERE id = ? AND user_id = ?',
    id,
    scope.userId,
  )

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Папка не найдена' })
  }

  // Заметки вынимаем из папки явно: полагаться только на FK в D1 не стоит
  // (PRAGMA foreign_keys в некоторых режимах выключен).
  await db.run('UPDATE notes SET folder_id = NULL WHERE folder_id = ?', id)
  await db.run('DELETE FROM folders WHERE id = ? AND user_id = ?', id, scope.userId)

  setResponseStatus(event, 204)

  return null
})

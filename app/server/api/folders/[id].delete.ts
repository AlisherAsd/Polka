// DELETE /api/folders/:id — удалить папку пользователя.
//
// Заметки папки не пропадают: у них `folder_id` становится NULL
// (`ON DELETE SET NULL`), то есть файлы переезжают в корень базы знаний.
// Корневую папку «Мои знания» (`is_root = 1`) удалить нельзя.
import { dbOf } from '../../utils/notes'
import { scopeFor } from '../../utils/scope'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''

  const db = dbOf(event)
  const scope = await scopeFor(event)

  // Удаляем только свою папку: общие чужие не трогаем.
  if (!scope.userId) {
    throw createError({ statusCode: 401, message: 'Нужен вход' })
  }

  const existing = await db.first<{ id: string; is_root: number }>(
    'SELECT id, is_root FROM folders WHERE id = ? AND user_id = ?',
    id,
    scope.userId,
  )

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Папка не найдена' })
  }

  // «Мои знания» — корень, на нём держится вся структура папок.
  if (existing.is_root === 1) {
    throw createError({ statusCode: 400, message: 'Папку «Мои знания» удалить нельзя' })
  }

  // Заметки вынимаем из папки явно: полагаться только на FK в D1 не стоит
  // (PRAGMA foreign_keys в некоторых режимах выключен).
  await db.run('UPDATE notes SET folder_id = NULL WHERE folder_id = ?', id)
  // Публичные ссылки на папку и её доску больше не должны работать.
  await db.run(
    `DELETE FROM shares
     WHERE user_id = ?
       AND (
         (kind = 'folder' AND ref_id = ?)
         OR (kind = 'board' AND ref_id IN (SELECT id FROM boards WHERE folder_id = ?))
       )`,
    scope.userId,
    id,
    id,
  )

  await db.run('DELETE FROM folders WHERE id = ? AND user_id = ?', id, scope.userId)

  setResponseStatus(event, 204)

  return null
})

// PATCH /api/folders/:id — настройки доски: название папки и превью.
//
// Превью — ссылка на картинку для карточки доски на главной. Пустая строка
// очищает превью (на карточке снова заглушка).
import { getDatabase } from '../../utils/db'
import { currentUserId } from '../../utils/scope'
import { listFolders } from '../../utils/workspaces'

const MAX_NAME = 120
const MAX_PREVIEW = 2000

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const userId = await currentUserId(event)

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Нужен вход' })
  }

  const db = getDatabase(event)
  const existing = await db.first<{ id: string }>(
    'SELECT id FROM folders WHERE id = ? AND user_id = ?',
    id,
    userId,
  )

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Папка не найдена' })
  }

  const body = (await readBody<{ name?: unknown; preview?: unknown }>(event)) ?? {}
  const sets: string[] = []
  const values: unknown[] = []

  if ('name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (name.length === 0) {
      throw createError({ statusCode: 400, message: 'Укажите название доски' })
    }

    if (name.length > MAX_NAME) {
      throw createError({ statusCode: 400, message: `Название длиннее ${MAX_NAME} символов` })
    }

    sets.push('name = ?')
    values.push(name)
  }

  if ('preview' in body) {
    const preview = typeof body.preview === 'string' ? body.preview.trim() : ''

    if (preview.length > MAX_PREVIEW) {
      throw createError({ statusCode: 400, message: `Ссылка длиннее ${MAX_PREVIEW} символов` })
    }

    sets.push('preview = ?')
    values.push(preview.length > 0 ? preview : null)
  }

  if (sets.length > 0) {
    await db.run(
      `UPDATE folders SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
      ...values,
      id,
      userId,
    )
  }

  const folders = await listFolders(db, userId)
  const folder = folders.find((item) => item.id === id) ?? null

  return { folder }
})

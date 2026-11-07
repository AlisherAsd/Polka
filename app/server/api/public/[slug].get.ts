// GET /api/public/:slug — содержимое публичной подборки без авторизации.
//
// Отдаёт только то, что владелец опубликовал: заметки папки и связанные
// с ними карточки (или карточки доски). Личные данные (email, сессии,
// ключи) сюда не попадают.
import { readShare } from '../../utils/shares'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const collection = await readShare(event, slug)

  if (!collection) {
    throw createError({ statusCode: 404, message: 'Подборка не найдена' })
  }

  // Публичные страницы можно кэшировать на CDN.
  setHeader(event, 'cache-control', 'public, max-age=60')

  return { collection }
})

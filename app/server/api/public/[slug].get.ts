// GET /api/public/:slug — содержимое публичной подборки без авторизации.
//
// Отдаёт только то, что владелец опубликовал: узлы доски, заметки и карточки.
// Личные данные (email, сессии, ключи) сюда не попадают.
import { readShare } from '../../utils/shares'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const collection = await readShare(event, slug)

  if (!collection) {
    throw createError({ statusCode: 404, message: 'Подборка не найдена' })
  }

  // Никакого кеша: ссылку можно отозвать в любой момент, и доступ должен
  // пропадать сразу — и в браузере, и на CDN (`max-age` держал ответ 60 с).
  setHeader(event, 'cache-control', 'no-store, must-revalidate')

  return { collection }
})

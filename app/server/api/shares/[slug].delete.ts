// DELETE /api/shares/:slug — отозвать публичную ссылку (только свою).
import { getDatabase } from '../../utils/db'
import { revokeShare } from '../../utils/shares'
import { currentUserId } from '../../utils/scope'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const userId = await currentUserId(event)

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Нужен вход' })
  }

  const removed = await revokeShare(getDatabase(event), userId, slug)

  if (!removed) {
    throw createError({ statusCode: 404, message: 'Ссылка не найдена' })
  }

  setResponseStatus(event, 204)

  return null
})

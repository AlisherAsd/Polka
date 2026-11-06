// DELETE /api/items/:id — удаление карточки.
import { getDatabase } from '../../utils/db'
import { scopeFor } from '../../utils/scope'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const db = getDatabase(event)
  const scope = await scopeFor(event)
  const changes = await db.run(`DELETE FROM items WHERE id = ? AND ${scope.sql}`, id, ...scope.params)

  if (changes === 0) {
    throw createError({ statusCode: 404, message: 'Карточка не найдена' })
  }

  setResponseStatus(event, 204)

  return null
})

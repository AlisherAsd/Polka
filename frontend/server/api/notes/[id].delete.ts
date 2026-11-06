// DELETE /api/notes/:id — удалить заметку.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const db = dbOf(event)
  const changes = await db.run('DELETE FROM notes WHERE id = ?', id)

  if (changes === 0) {
    throw createError({ statusCode: 404, message: 'Заметка не найдена' })
  }

  setResponseStatus(event, 204)

  return null
})

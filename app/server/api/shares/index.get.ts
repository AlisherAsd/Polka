// GET /api/shares — публичные ссылки текущего пользователя.
//
// Нужно интерфейсу, чтобы показать «Сделать приватной» у уже опубликованной
// доски/папки: по списку видно, есть ли ссылка и какую отзывать.
import { getDatabase } from '../../utils/db'
import { currentUserId } from '../../utils/scope'

interface ShareRow {
  slug: string
  kind: string
  ref_id: string | null
  created_at: string
}

export default defineEventHandler(async (event) => {
  const userId = await currentUserId(event)

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Нужен вход' })
  }

  const db = getDatabase(event)
  const rows = await db.all<ShareRow>(
    'SELECT slug, kind, ref_id, created_at FROM shares WHERE user_id = ? ORDER BY created_at DESC',
    userId,
  )

  return {
    shares: rows.map((row) => ({
      slug: row.slug,
      kind: row.kind,
      refId: row.ref_id,
      url: `/board?share=${row.slug}`,
      createdAt: row.created_at,
    })),
  }
})

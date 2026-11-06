// GET /api/items — список карточек (новые первыми).
import { getDatabase } from '../../utils/db'
import { toItem, type ItemRow } from '../../utils/items'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const raw = Number(query.limit ?? 100)
  const limit = Number.isFinite(raw) ? Math.min(500, Math.max(1, Math.trunc(raw))) : 100

  const db = getDatabase(event)
  const rows = await db.all<ItemRow>(
    'SELECT * FROM items ORDER BY created_at DESC, rowid DESC LIMIT ?',
    limit,
  )

  return { items: rows.map(toItem) }
})

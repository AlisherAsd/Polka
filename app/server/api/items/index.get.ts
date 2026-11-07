// GET /api/items — список карточек (новые первыми).
import { getDatabase } from '../../utils/db'
import { toItem, type ItemRow } from '../../utils/items'
import { scopeFor } from '../../utils/scope'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const raw = Number(query.limit ?? 100)
  const limit = Number.isFinite(raw) ? Math.min(500, Math.max(1, Math.trunc(raw))) : 100

  const db = getDatabase(event)
  const scope = await scopeFor(event)

  const rows = await db.all<ItemRow>(
    `SELECT * FROM items WHERE ${scope.sql} ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    ...scope.params,
    limit,
  )


  return { items: rows.map(toItem) }
})

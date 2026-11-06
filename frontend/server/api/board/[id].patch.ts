// PATCH /api/board/:id — сохранить позицию (и размер) узла доски.
// Тело: { x, y, width?, height? }. `id` — это `item_id` или `note_id` узла.
import { getDatabase } from '../../utils/db'

interface ExistingRow {
  id: string
}

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'id') ?? ''
  const body = (await readBody<Record<string, unknown>>(event)) ?? {}
  const db = getDatabase(event)

  const x = Number(body.x)
  const y = Number(body.y)

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw createError({ statusCode: 400, message: 'Некорректные координаты' })
  }

  const width = Number.isFinite(Number(body.width)) && body.width !== undefined
    ? Number(body.width)
    : null
  const height = Number.isFinite(Number(body.height)) && body.height !== undefined
    ? Number(body.height)
    : null

  const now = new Date().toISOString()
  const existing = await db.first<ExistingRow>(
    'SELECT id FROM board_nodes WHERE item_id = ? OR note_id = ?',
    key,
    key,
  )

  // Узел мог появиться раньше — тогда обновляем. Новый создаём по id
  // карточки/заметки: проверяем, что такая сущность действительно есть.
  if (existing) {
    await db.run(
      `UPDATE board_nodes SET x = ?, y = ?, width = COALESCE(?, width),
         height = COALESCE(?, height), updated_at = ? WHERE id = ?`,
      x,
      y,
      width,
      height,
      now,
      existing.id,
    )

    return { id: existing.id, x, y, width: width ?? undefined, height: height ?? undefined }
  }

  const item = await db.first<{ id: string }>('SELECT id FROM items WHERE id = ?', key)
  const note = item ? null : await db.first<{ id: string }>('SELECT id FROM notes WHERE id = ?', key)

  if (!item && !note) {
    throw createError({ statusCode: 404, message: 'Узел не найден' })
  }

  const id = crypto.randomUUID()

  await db.run(
    `INSERT INTO board_nodes (id, item_id, note_id, x, y, width, height, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    item ? key : null,
    note ? key : null,
    x,
    y,
    width,
    height,
    now,
    now,
  )

  return { id, x, y, width: width ?? undefined, height: height ?? undefined }
})

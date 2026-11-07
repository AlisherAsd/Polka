// PATCH /api/boards/:folderId/nodes/:key — позиция узла на доске папки.
//
// `key` — id карточки или заметки. Узел создаётся при первом сохранении.
// Тело: { x, y, width?, height? }.
import { getDatabase } from '../../../../utils/db'
import { ensureBoard } from '../../../../utils/workspaces'
import { currentUserId } from '../../../../utils/scope'

export default defineEventHandler(async (event) => {
  const folderId = getRouterParam(event, 'folderId') ?? ''
  const key = getRouterParam(event, 'key') ?? ''
  const body = (await readBody<Record<string, unknown>>(event)) ?? {}
  const userId = await currentUserId(event)

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Нужен вход' })
  }

  const x = Number(body.x)
  const y = Number(body.y)

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw createError({ statusCode: 400, message: 'Некорректные координаты' })
  }

  const width = body.width !== undefined && Number.isFinite(Number(body.width)) ? Number(body.width) : null
  const height = body.height !== undefined && Number.isFinite(Number(body.height)) ? Number(body.height) : null

  const db = getDatabase(event)
  const board = await ensureBoard(db, userId, folderId)
  const now = new Date().toISOString()

  const existing = await db.first<{ id: string }>(
    'SELECT id FROM board_nodes WHERE board_id = ? AND (item_id = ? OR note_id = ?)',
    board.id,
    key,
    key,
  )

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

  // Узел можно поставить только на доступную карточку или заметку.
  const item = await db.first<{ id: string }>(
    'SELECT id FROM items WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
    key,
    userId,
  )
  const note = item
    ? null
    : await db.first<{ id: string }>(
      'SELECT id FROM notes WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      key,
      userId,
    )

  if (!item && !note) {
    throw createError({ statusCode: 404, message: 'Узел не найден' })
  }

  const id = crypto.randomUUID()

  await db.run(
    `INSERT INTO board_nodes (id, board_id, item_id, note_id, x, y, width, height, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    board.id,
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

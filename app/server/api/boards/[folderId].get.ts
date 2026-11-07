// GET /api/boards/:folderId — доска конкретной папки (создаётся при первом обращении).
// Ответ: { board: { id, folderId, nodes } }. Узлы — позиции карточек и заметок.
import { getDatabase } from '../../utils/db'
import { ensureBoard } from '../../utils/workspaces'
import { currentUserId } from '../../utils/scope'

interface NodeRow {
  id: string
  item_id: string | null
  note_id: string | null
  x: number
  y: number
  width: number | null
  height: number | null
  updated_at: string
}

/** Сетка автораскладки новых узлов. */
const COLUMNS = 4
const CARD_WIDTH = 200
const FILE_WIDTH = 280
const STEP_X = 220
const STEP_Y = 260
const PADDING = 24

export default defineEventHandler(async (event) => {
  const folderId = getRouterParam(event, 'folderId') ?? ''
  const userId = await currentUserId(event)

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Нужен вход' })
  }

  const db = getDatabase(event)
  const board = await ensureBoard(db, userId, folderId)

  // Авто-раскладка: заметки папки и связанные с ними карточки, которых ещё нет
  // на доске, добавляются в свободные ячейки. Так доска папки не пустая,
  // но и не показывает чужие данные — только содержимое этой папки.
  const noteRows = await db.all<{ id: string; item_id: string | null }>(
    'SELECT id, item_id FROM notes WHERE folder_id = ? AND user_id = ? ORDER BY created_at ASC',
    folderId,
    userId,
  )

  const existing = await db.all<{ item_id: string | null; note_id: string | null }>(
    'SELECT item_id, note_id FROM board_nodes WHERE board_id = ?',
    board.id,
  )
  const placedItems = new Set(existing.map((row) => row.item_id).filter(Boolean) as string[])
  const placedNotes = new Set(existing.map((row) => row.note_id).filter(Boolean) as string[])

  const now = new Date().toISOString()
  let index = existing.length

  for (const note of noteRows) {
    const keys: { itemId: string | null; noteId: string | null; width: number }[] = []

    // Сначала карточка (если есть и ещё не на доске), затем её заметка.
    if (note.item_id && !placedItems.has(note.item_id)) {
      const item = await db.first<{ id: string }>(
        'SELECT id FROM items WHERE id = ? AND user_id = ?',
        note.item_id,
        userId,
      )

      if (item) {
        keys.push({ itemId: note.item_id, noteId: null, width: CARD_WIDTH })
        placedItems.add(note.item_id)
      }
    }

    if (!placedNotes.has(note.id)) {
      keys.push({ itemId: null, noteId: note.id, width: FILE_WIDTH })
      placedNotes.add(note.id)
    }

    for (const key of keys) {
      await db.run(
        `INSERT INTO board_nodes (id, board_id, item_id, note_id, x, y, width, height, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        crypto.randomUUID(),
        board.id,
        key.itemId,
        key.noteId,
        (index % COLUMNS) * STEP_X + PADDING,
        Math.floor(index / COLUMNS) * STEP_Y + PADDING,
        key.width,
        null,
        now,
        now,
      )

      index++
    }
  }

  const rows = await db.all<NodeRow>(
    'SELECT * FROM board_nodes WHERE board_id = ? ORDER BY created_at ASC',
    board.id,
  )

  const nodes = rows.map((row) => {
    const node: {
      id: string
      itemId?: string
      noteId?: string
      x: number
      y: number
      width?: number
      height?: number
      updatedAt: string
    } = { id: row.id, x: row.x, y: row.y, updatedAt: row.updated_at }

    if (row.item_id) {
      node.itemId = row.item_id
    }

    if (row.note_id) {
      node.noteId = row.note_id
    }

    if (typeof row.width === 'number') {
      node.width = row.width
    }

    if (typeof row.height === 'number') {
      node.height = row.height
    }

    return node
  })

  return { board: { id: board.id, folderId: board.folder_id, nodes } }
})

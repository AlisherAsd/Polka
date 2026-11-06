// GET /api/board — расположение узлов доски (карточек и заметок-файлов).
import { getDatabase } from '../../utils/db'

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

export default defineEventHandler(async (event) => {
  const db = getDatabase(event)
  const rows = await db.all<NodeRow>('SELECT * FROM board_nodes ORDER BY created_at ASC')

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
    } = {
      id: row.id,
      x: row.x,
      y: row.y,
      updatedAt: row.updated_at,
    }

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

  return { nodes }
})

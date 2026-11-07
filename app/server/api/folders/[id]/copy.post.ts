// POST /api/folders/:id/copy — скопировать папку вместе с доской.
//
// Копируется вся связка: сама папка (новая запись того же пользователя),
// её заметки, позиции узлов на доске. Карточки не копируются — заметки
// остаются привязанными к тем же карточкам, если они доступны владельцу.
//
// Ответ: `{ folder }` с новым `boardId` — клиент открывает копию.
import { dbOf } from '../../../utils/notes'
import { ensureBoard, listFolders } from '../../../utils/workspaces'
import { currentUserId } from '../../../utils/scope'

interface FolderRowLike {
  id: string
  name: string
  user_id: string
  is_root: number
  parent_id: string | null
}

export default defineEventHandler(async (event) => {
  const sourceId = getRouterParam(event, 'id') ?? ''
  const userId = await currentUserId(event)

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Нужен вход' })
  }

  const db = dbOf(event)
  const source = await db.first<FolderRowLike>(
    'SELECT id, name, user_id, is_root, parent_id FROM folders WHERE id = ? AND user_id = ?',
    sourceId,
    userId,
  )

  if (!source) {
    throw createError({ statusCode: 404, message: 'Папка не найдена' })
  }

  const now = new Date().toISOString()
  const suffix = new Date(now).toLocaleDateString('ru-RU')
  const newId = `${source.id}-copy-${crypto.randomUUID().slice(0, 8)}`
  const newName = `${source.name} — копия ${suffix}`

  // Верхняя папка копируется как верхняя (со своей доской), вложенная — во вложенные.
  await db.run(
    `INSERT INTO folders (id, name, slug, created_at, user_id, is_root, parent_id)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    newId,
    newName,
    newId,
    now,
    userId,
    source.parent_id,
  )

  // Заметки папки → новые строки с привязкой к новой папке.
  const noteRows = await db.all<{
    id: string
    item_id: string | null
    title: string
    content: string
    url: string | null
  }>(
    'SELECT id, item_id, title, content, url FROM notes WHERE folder_id = ? AND user_id = ?',
    source.id,
    userId,
  )

  const idMap = new Map<string, string>()

  for (const note of noteRows) {
    const copyId = crypto.randomUUID()

    idMap.set(note.id, copyId)

    await db.run(
      `INSERT INTO notes (id, folder_id, item_id, title, content, url, created_at, updated_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      copyId,
      newId,
      note.item_id,
      note.title,
      note.content,
      note.url,
      now,
      now,
      userId,
    )
  }

  // Доска: у копии верхней папки своя доска, узлы переносятся с новыми id заметок.
  if (!source.parent_id) {
    const sourceBoard = await db.first<{ id: string }>(
      'SELECT id FROM boards WHERE folder_id = ? AND user_id = ?',
      source.id,
      userId,
    )

    const newBoard = await ensureBoard(db, userId, newId)

    if (sourceBoard) {
      const nodes = await db.all<{
        item_id: string | null
        note_id: string | null
        x: number
        y: number
        width: number | null
        height: number | null
      }>(
        'SELECT item_id, note_id, x, y, width, height FROM board_nodes WHERE board_id = ?',
        sourceBoard.id,
      )

      for (const node of nodes) {
        const noteId = node.note_id ? idMap.get(node.note_id) ?? null : null

        // Узлы «старых» заметок, которых нет в копии, не переносим.
        if (node.note_id && !noteId) {
          continue
        }

        await db.run(
          `INSERT INTO board_nodes (id, board_id, item_id, note_id, x, y, width, height, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          crypto.randomUUID(),
          newBoard.id,
          node.item_id,
          noteId,
          node.x,
          node.y,
          node.width,
          node.height,
          now,
          now,
        )
      }
    }
  }

  const folders = await listFolders(db, userId)
  const folder = folders.find((item) => item.id === newId) ?? null

  setResponseStatus(event, 201)

  return { folder }
})

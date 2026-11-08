// GET /api/boards — данные главной: свои папки-доски и публичные доски.
//
// Свои папки — без корня («Мои знания») и без вложенных: каждый элемент
// открывается как доска `/board?folder=<id>`. Публичные — общая лента
// опубликованных досок (включая чужие), открываются по `/board?share=<slug>`.
import { getDatabase, type Database } from '../../utils/db'
import { currentUserId } from '../../utils/scope'

interface FolderRow {
  id: string
  name: string
  board_id: string | null
  created_at: string
}

interface ShareRow {
  slug: string
  kind: string
  ref_id: string | null
  user_id: string
  created_at: string
  email: string | null
}

interface BoardRow {
  id: string
  folder_id: string
}

interface HomeFolder {
  id: string
  name: string
  boardId: string | null
  files: number
  cards: number
  shareSlug: string | null
}

interface HomePublicBoard {
  slug: string
  title: string
  author: string
  files: number
  kind: string
  createdAt: string
}

/** Сколько заметок лежит в папке. */
async function filesInFolder(db: Database, folderId: string): Promise<number> {
  const row = await db.first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM notes WHERE folder_id = ?',
    folderId,
  )

  return row?.n ?? 0
}

/** Сколько карточек (узлов) лежит на доске. */
async function cardsOnBoard(db: Database, boardId: string): Promise<number> {
  const row = await db.first<{ n: number }>(
    'SELECT COUNT(*) AS n FROM board_nodes WHERE board_id = ? AND item_id IS NOT NULL',
    boardId,
  )

  return row?.n ?? 0
}

/** Автор публичной доски: полный email (кружок с буквой рисует клиент). */
function authorOf(email: string | null): string {
  return email?.trim() || 'Полка'
}

export default defineEventHandler(async (event) => {
  const db = getDatabase(event)
  const userId = await currentUserId(event)

  const folders: HomeFolder[] = []

  if (userId) {
    const rows = await db.all<FolderRow>(
      `SELECT f.id, f.name, b.id AS board_id, f.created_at
       FROM folders f
       LEFT JOIN boards b ON b.folder_id = f.id
       WHERE f.user_id = ? AND f.is_root = 0 AND f.parent_id IS NULL
       ORDER BY f.created_at ASC`,
      userId,
    )

    const shares = await db.all<ShareRow>(
      'SELECT slug, kind, ref_id, user_id, created_at, NULL AS email FROM shares WHERE user_id = ?',
      userId,
    )

    for (const row of rows) {
      const share = shares.find((item) =>
        (item.kind === 'board' && item.ref_id === row.board_id)
        || (item.kind === 'folder' && item.ref_id === row.id),
      )

      folders.push({
        id: row.id,
        name: row.name,
        boardId: row.board_id,
        files: await filesInFolder(db, row.id),
        cards: row.board_id ? await cardsOnBoard(db, row.board_id) : 0,
        shareSlug: share?.slug ?? null,
      })
    }
  }

  const shareRows = await db.all<ShareRow>(
    `SELECT s.slug, s.kind, s.ref_id, s.user_id, s.created_at, u.email
     FROM shares s
     JOIN users u ON u.id = s.user_id
     WHERE s.ref_id IS NOT NULL
     ORDER BY s.created_at DESC`,
  )

  const publicBoards: HomePublicBoard[] = []
  const seenFolders = new Set<string>()

  for (const share of shareRows) {
    // Свои доски уже показаны в первом блоке.
    if (userId && share.user_id === userId) {
      continue
    }

    let folder: { id: string; name: string } | null = null
    let board: BoardRow | null = null

    if (share.kind === 'board') {
      board = await db.first<BoardRow>(
        'SELECT id, folder_id FROM boards WHERE id = ? AND user_id = ?',
        share.ref_id,
        share.user_id,
      )

      if (board) {
        folder = await db.first<{ id: string; name: string }>(
          'SELECT id, name FROM folders WHERE id = ? AND user_id = ?',
          board.folder_id,
          share.user_id,
        )
      }
    } else if (share.kind === 'folder') {
      folder = await db.first<{ id: string; name: string }>(
        'SELECT id, name FROM folders WHERE id = ? AND user_id = ?',
        share.ref_id,
        share.user_id,
      )
    }

    if (!folder || seenFolders.has(folder.id)) {
      continue
    }

    seenFolders.add(folder.id)

    publicBoards.push({
      slug: share.slug,
      title: folder.name,
      author: authorOf(share.email),
      files: await filesInFolder(db, folder.id),
      kind: share.kind,
      createdAt: share.created_at,
    })

    if (publicBoards.length >= 48) {
      break
    }
  }

  return { folders, publicBoards }
})

// «Мои знания»: корневая папка пользователя и доски верхних папок.
//
// Модель:
//   * у каждого пользователя одна корневая папка (`folders.is_root = 1`)
//     с именем «Мои знания»;
//   * папка верхнего уровня (`parent_id IS NULL`) имеет ровно одну доску;
//     описывается таблицей `boards`, узлы ссылаются на `board_id`;
//   * вложенные папки своей доски не имеют — их содержимое живёт на доске
//     родителя.
import type { Database } from './db'

export const ROOT_FOLDER_NAME = 'Мои знания'

export interface FolderLike {
  id: string
  name: string
  slug: string | null
  is_root: number
  parent_id: string | null
  user_id: string | null
  preview: string | null
  created_at: string
}

export interface BoardRow {
  id: string
  folder_id: string
  user_id: string
  created_at: string
}

/** Публичное представление папки/доски для клиента. */
export interface FolderView {
  id: string
  name: string
  isRoot: boolean
  parentId: string | null
  /** id доски верхней папки; `null` у вложенных. */
  boardId: string | null
  /** Ссылка на превью доски (картинка для карточки на главной). */
  preview: string | null
  createdAt: string
}

/**
 * Гарантирует корневую папку «Мои знания» с доской и возвращает её.
 * Корень — такая же папка, как остальные (со своей доской), но её нельзя удалить.
 */
export async function ensureRootFolder(db: Database, userId: string): Promise<{ folder: FolderLike; board: BoardRow }> {
  let folder = await db.first<FolderLike>(
    'SELECT * FROM folders WHERE user_id = ? AND is_root = 1',
    userId,
  )

  if (!folder) {
    const id = `root-${userId}`
    const now = new Date().toISOString()

    await db.run(
      `INSERT INTO folders (id, name, slug, created_at, user_id, is_root)
       VALUES (?, ?, ?, ?, ?, 1)`,
      id,
      ROOT_FOLDER_NAME,
      id,
      now,
      userId,
    )

    folder = await db.first<FolderLike>('SELECT * FROM folders WHERE id = ?', id)
  }

  if (!folder) {
    throw createError({ statusCode: 500, message: 'Не удалось создать корневую папку' })
  }

  let board = await db.first<BoardRow>('SELECT * FROM boards WHERE folder_id = ?', folder.id)

  if (!board) {
    const boardId = `board-${folder.id}`

    await db.run(
      'INSERT INTO boards (id, folder_id, user_id, created_at) VALUES (?, ?, ?, ?)',
      boardId,
      folder.id,
      userId,
      new Date().toISOString(),
    )

    board = await db.first<BoardRow>('SELECT * FROM boards WHERE id = ?', boardId)
  }

  if (!board) {
    throw createError({ statusCode: 500, message: 'Не удалось создать доску' })
  }

  return { folder, board }
}

/** Доска верхней папки (создаётся, если её ещё нет). */
export async function ensureBoard(db: Database, userId: string, folderId: string): Promise<BoardRow> {
  const existing = await db.first<BoardRow>(
    'SELECT * FROM boards WHERE folder_id = ? AND user_id = ?',
    folderId,
    userId,
  )

  if (existing) {
    return existing
  }

  const folder = await db.first<FolderLike>(
    'SELECT * FROM folders WHERE id = ? AND user_id = ?',
    folderId,
    userId,
  )

  if (!folder) {
    throw createError({ statusCode: 404, message: 'Папка не найдена' })
  }

  // У вложенных папок своей доски нет — работаем на доске родителя.
  if (folder.parent_id) {
    const parentBoard = await db.first<BoardRow>(
      'SELECT * FROM boards WHERE folder_id = ? AND user_id = ?',
      folder.parent_id,
      userId,
    )

    if (parentBoard) {
      return parentBoard
    }
  }

  const boardId = `board-${folder.id}`

  await db.run(
    'INSERT INTO boards (id, folder_id, user_id, created_at) VALUES (?, ?, ?, ?)',
    boardId,
    folder.id,
    userId,
    new Date().toISOString(),
  )

  const created = await db.first<BoardRow>('SELECT * FROM boards WHERE id = ?', boardId)

  if (!created) {
    throw createError({ statusCode: 500, message: 'Не удалось создать доску' })
  }

  return created
}

/** Список папок пользователя: корень + верхний уровень, с id доски. */
export async function listFolders(db: Database, userId: string): Promise<FolderView[]> {
  const rows = await db.all<FolderLike & { board_id: string | null }>(
    `SELECT f.*, b.id AS board_id
     FROM folders f
     LEFT JOIN boards b ON b.folder_id = f.id
     WHERE f.user_id = ? AND f.parent_id IS NULL
     ORDER BY f.is_root DESC, f.created_at ASC`,
    userId,
  )

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isRoot: row.is_root === 1,
    parentId: row.parent_id,
    boardId: row.board_id ?? null,
    preview: row.preview ?? null,
    createdAt: row.created_at,
  }))
}

/**
 * Приводит список папок пользователя к базовому состоянию: остаётся только
 * «Мои знания» (корень). Остальные папки — включая подпапки — удаляются,
 * заметки из них переезжают в корень (не теряются).
 *
 * Вызывается при создании аккаунта; вручную — ручкой `/api/folders/reset`.
 */
export async function resetFoldersToBaseline(db: Database, userId: string): Promise<void> {
  const { folder: root } = await ensureRootFolder(db, userId)

  await db.run(
    `UPDATE notes SET folder_id = ?
     WHERE user_id = ? AND folder_id IS NOT NULL AND folder_id <> ?`,
    root.id,
    userId,
    root.id,
  )

  await db.run(
    `DELETE FROM folders
     WHERE user_id = ?
       AND is_root = 0`,
    userId,
  )
}

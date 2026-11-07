// Публичные подборки: выдача ссылки на папку или доску и чтение без входа.
//
// Ссылка вида `/board?share=<slug>` открывается **анонимно**: сервер отдаёт
// только то, что входит в опубликованную папку, и ничего больше. Владелец
// может отозвать ссылку в любой момент. Старые `/b/<slug>` редиректят сюда.
import { getDatabase, type Database } from './db'
import { toNote, type NoteRow, type Note } from './notes'
import { toItem, type Item as Card, type ItemRow } from './items'

/** Что делим. */
export type ShareKind = 'folder' | 'board'

export interface ShareRow {
  id: string
  user_id: string
  kind: ShareKind
  ref_id: string | null
  slug: string
  created_at: string
}

/** Узел доски в публичной подборке: координаты и ссылка на карточку/заметку. */
export interface PublicNode {
  itemId?: string
  noteId?: string
  x: number
  y: number
  width?: number
  height?: number
}

/** Публичное представление подборки. */
export interface PublicCollection {
  slug: string
  kind: ShareKind
  title: string
  /** Заметки-файлы подборки. */
  notes: Note[]
  /** Карточки: и лежащие на доске, и привязанные к заметкам. */
  cards: Card[]
  /** Раскладка доски: без неё страница покажет список материалов. */
  nodes: PublicNode[]
  /** Папка подборки (для копирования папки, например при клонировании). */
  folderId: string | null
  /** Доска подборки. */
  boardId: string | null
  /** Кто поделился: email автора. */
  author: string | null
  createdAt: string
}

/** Читаемый короткий идентификатор ссылки. */
export function makeSlug(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))

  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('')
}

/** Ссылка на подборку уже существует (или создаётся идемпотентно). */
export async function getOrCreateShare(
  db: Database,
  userId: string,
  kind: ShareKind,
  refId: string | null,
): Promise<ShareRow> {
  const existing = refId
    ? await db.first<ShareRow>(
      'SELECT * FROM shares WHERE user_id = ? AND kind = ? AND ref_id = ?',
      userId,
      kind,
      refId,
    )
    : await db.first<ShareRow>(
      'SELECT * FROM shares WHERE user_id = ? AND kind = ? AND ref_id IS NULL',
      userId,
      kind,
    )

  if (existing) {
    return existing
  }

  const id = crypto.randomUUID()
  const slug = makeSlug()

  await db.run(
    'INSERT INTO shares (id, user_id, kind, ref_id, slug, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    userId,
    kind,
    refId,
    slug,
    new Date().toISOString(),
  )

  return { id, user_id: userId, kind, ref_id: refId, slug, created_at: new Date().toISOString() }
}

/** Удаляет ссылку (отзыв доступа). `true` — если была. */
export async function revokeShare(db: Database, userId: string, slug: string): Promise<boolean> {
  const changes = await db.run('DELETE FROM shares WHERE slug = ? AND user_id = ?', slug, userId)

  return changes > 0
}

interface BoardRowLike {
  id: string
  folder_id: string
  user_id: string
}

interface NodeRowLike {
  item_id: string | null
  note_id: string | null
  x: number
  y: number
  width: number | null
  height: number | null
}

/**
 * Содержимое доски для публичной страницы: узлы с координатами + заметки
 * папки + карточки, которые на ней лежат.
 *
 * Доска — главное, что видит гость по ссылке: страница рисует её как есть.
 * Список заметок/карточек остаётся запасным вариантом для старых ссылок.
 */
async function boardContent(
  db: Database,
  board: BoardRowLike,
): Promise<{ notes: Note[]; cards: Card[]; nodes: PublicNode[] }> {
  const nodeRows = await db.all<NodeRowLike>(
    `SELECT item_id, note_id, x, y, width, height
     FROM board_nodes WHERE board_id = ? ORDER BY created_at ASC`,
    board.id,
  )

  const noteRows = await db.all<NoteRow>(
    'SELECT * FROM notes WHERE folder_id = ? AND user_id = ? ORDER BY created_at DESC',
    board.folder_id,
    board.user_id,
  )
  const notes = noteRows.map(toNote)

  // Карточки: те, что лежат на доске, и те, к которым привязаны заметки папки.
  const itemIds = new Set<string>()

  for (const row of nodeRows) {
    if (row.item_id) {
      itemIds.add(row.item_id)
    }
  }

  for (const note of notes) {
    if (note.itemId) {
      itemIds.add(note.itemId)
    }
  }

  const cards: Card[] = []

  for (const itemId of itemIds) {
    const row = await db.first<ItemRow>(
      'SELECT * FROM items WHERE id = ? AND user_id = ?',
      itemId,
      board.user_id,
    )

    if (row) {
      cards.push(toItem(row))
    }
  }

  const nodes: PublicNode[] = []

  for (const row of nodeRows) {
    const node: PublicNode = { x: row.x, y: row.y }

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

    nodes.push(node)
  }

  return { notes, cards, nodes }
}

/** Email автора для публичной страницы. */
async function authorOf(db: Database, userId: string): Promise<string | null> {
  const row = await db.first<{ email: string }>('SELECT email FROM users WHERE id = ?', userId)

  const email = row?.email?.trim()

  return email && email.length > 0 ? email : null
}

/** Собирает публичное содержимое подборки. `null` — ссылки нет. */
export async function readShare(event: Parameters<typeof getDatabase>[0], slug: string): Promise<PublicCollection | null> {
  const db = getDatabase(event)
  const share = await db.first<ShareRow>('SELECT * FROM shares WHERE slug = ?', slug)

  if (!share) {
    return null
  }

  // Публикуется доска → папка и владелец берутся из самой доски.
  if (share.kind === 'board' && share.ref_id) {
    const board = await db.first<BoardRowLike>(
      'SELECT id, folder_id, user_id FROM boards WHERE id = ? AND user_id = ?',
      share.ref_id,
      share.user_id,
    )

    if (!board) {
      return null
    }

    const folder = await db.first<{ id: string; name: string }>(
      'SELECT id, name FROM folders WHERE id = ?',
      board.folder_id,
    )
    const content = await boardContent(db, board)

    return {
      slug: share.slug,
      kind: 'board',
      title: folder?.name ?? 'Доска',
      notes: content.notes,
      cards: content.cards,
      nodes: content.nodes,
      folderId: board.folder_id,
      boardId: board.id,
      createdAt: share.created_at,
      author: await authorOf(db, share.user_id),
    }
  }

  // Папка: заметки этой папки у владельца + её доска (если уже создана).
  if (share.kind === 'folder' && share.ref_id) {
    const folder = await db.first<{ id: string; name: string }>(
      'SELECT id, name FROM folders WHERE id = ? AND user_id = ?',
      share.ref_id,
      share.user_id,
    )

    if (!folder) {
      return null
    }

    const board = await db.first<BoardRowLike>(
      'SELECT id, folder_id, user_id FROM boards WHERE folder_id = ? AND user_id = ?',
      folder.id,
      share.user_id,
    )

    if (board) {
      const content = await boardContent(db, board)

      return {
        slug: share.slug,
        kind: 'folder',
        title: folder.name,
        notes: content.notes,
        cards: content.cards,
        nodes: content.nodes,
        folderId: folder.id,
        boardId: board.id,
        createdAt: share.created_at,
        author: await authorOf(db, share.user_id),
      }
    }

    // Доски ещё нет — доска создастся при первом открытии владельцем.
    // Пока отдаём список заметок папки и их карточек (как раньше).
    const noteRows = await db.all<NoteRow>(
      'SELECT * FROM notes WHERE folder_id = ? AND user_id = ? ORDER BY created_at DESC',
      folder.id,
      share.user_id,
    )
    const notes = noteRows.map(toNote)
    const cards: Card[] = []

    for (const note of notes) {
      if (!note.itemId) {
        continue
      }

      const row = await db.first<ItemRow>(
        'SELECT * FROM items WHERE id = ? AND user_id = ?',
        note.itemId,
        share.user_id,
      )

      if (row) {
        cards.push(toItem(row))
      }
    }

    return {
      slug: share.slug,
      kind: 'folder',
      title: folder.name,
      notes,
      cards,
      nodes: [],
      folderId: folder.id,
      boardId: null,
      createdAt: share.created_at,
      author: await authorOf(db, share.user_id),
    }
  }

  // Старые ссылки без ref_id: показываем карточки владельца списком.
  const itemRows = await db.all<ItemRow>(
    'SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    share.user_id,
  )

  return {
    slug: share.slug,
    kind: 'board',
    title: 'Доска',
    notes: [],
    cards: itemRows.map(toItem),
    nodes: [],
    folderId: null,
    boardId: null,
    createdAt: share.created_at,
    author: await authorOf(db, share.user_id),
  }
}

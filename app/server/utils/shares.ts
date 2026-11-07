// Публичные подборки: выдача ссылки на папку или доску и чтение без входа.
//
// Ссылка вида `/b/<slug>` открывается **анонимно**: сервер отдаёт только
// то, что входит в опубликованную папку, и ничего больше. Владелец
// может отозвать ссылку в любой момент.
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

/** Публичное представление подборки. */
export interface PublicCollection {
  slug: string
  kind: ShareKind
  title: string
  /** Заметки-файлы подборки. */
  notes: Note[]
  /** Карточки, привязанные к этим заметкам (или вся доска при `kind = board`). */
  cards: Card[]
  /** Папка подборки: нужна для «Сохранить себе» (копирования). */
  folderId: string | null
  /** Доска подборки. */
  boardId: string | null
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

/** Собирает публичное содержимое подборки. `null` — ссылки нет. */
export async function readShare(event: Parameters<typeof getDatabase>[0], slug: string): Promise<PublicCollection | null> {
  const db = getDatabase(event)
  const share = await db.first<ShareRow>('SELECT * FROM shares WHERE slug = ?', slug)

  if (!share) {
    return null
  }

  // Публикуется именно доска → владелец и папка берутся из `shares.ref_id`.
  if (share.kind === 'board' && share.ref_id) {
    const board = await db.first<{ id: string; folder_id: string; user_id: string }>(
      'SELECT id, folder_id, user_id FROM boards WHERE id = ?',
      share.ref_id,
    )

    if (!board) {
      return null
    }

    const folder = await db.first<{ id: string; name: string }>(
      'SELECT id, name FROM folders WHERE id = ?',
      board.folder_id,
    )

    const noteRows = await db.all<NoteRow>(
      'SELECT * FROM notes WHERE folder_id = ? AND user_id = ? ORDER BY created_at DESC',
      board.folder_id,
      board.user_id,
    )
    const itemRows = await db.all<ItemRow>(
      'SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      board.user_id,
    )

    return {
      slug: share.slug,
      kind: 'board',
      title: folder?.name ?? 'Доска',
      notes: noteRows.map(toNote),
      cards: itemRows.map(toItem),
      folderId: board.folder_id,
      boardId: board.id,
      createdAt: share.created_at,
    }
  }

  // Папка: заметки этой папки у владельца + связанные с ними карточки.
  if (share.kind === 'folder' && share.ref_id) {
    const folder = await db.first<{ id: string; name: string }>(
      'SELECT id, name FROM folders WHERE id = ? AND user_id = ?',
      share.ref_id,
      share.user_id,
    )

    const noteRows = await db.all<NoteRow>(
      'SELECT * FROM notes WHERE folder_id = ? AND user_id = ? ORDER BY created_at DESC',
      share.ref_id,
      share.user_id,
    )

    const notes = noteRows.map(toNote)
    const itemIds = [...new Set(notes.map((note) => note.itemId).filter(Boolean))] as string[]
    const cards: Card[] = []

    for (const itemId of itemIds) {
      const row = await db.first<ItemRow>(
        'SELECT * FROM items WHERE id = ? AND user_id = ?',
        itemId,
        share.user_id,
      )

      if (row) {
        cards.push(toItem(row))
      }
    }

    return {
      slug: share.slug,
      kind: 'folder',
      title: folder?.name ?? 'Подборка',
      notes,
      cards,
      folderId: share.ref_id,
      boardId: null,
      createdAt: share.created_at,
    }
  }

  // Доска: все карточки владельца.
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
    folderId: null,
    boardId: null,
    createdAt: share.created_at,
  }
}

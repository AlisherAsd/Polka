// Заметки и папки базы знаний: доменные типы и общая логика роутов.
import type { H3Event } from 'h3'
import { getDatabase, type Database } from './db'

/** Служебная папка, куда ИИ складывает саммари карточек. */
export const AI_FOLDER_ID = 'ai-voult'

export interface Folder {
  id: string
  name: string
  slug?: string
  createdAt: string
}

export interface Note {
  id: string
  folderId: string | null
  itemId?: string
  title: string
  content: string
  url?: string
  createdAt: string
  updatedAt: string
}

export interface FolderRow {
  id: string
  name: string
  slug: string | null
  created_at: string
}

export interface NoteRow {
  id: string
  folder_id: string | null
  item_id: string | null
  title: string
  content: string
  url: string | null
  created_at: string
  updated_at: string
}

/** Строка папки → JSON (пустые поля не отдаём). */
export function toFolder(row: FolderRow): Folder {
  const folder: Folder = {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }

  if (row.slug) {
    folder.slug = row.slug
  }

  return folder
}

/** Строка заметки → JSON (пустые поля не отдаём). */
export function toNote(row: NoteRow): Note {
  const note: Note = {
    id: row.id,
    folderId: row.folder_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  }

  if (row.item_id) {
    note.itemId = row.item_id
  }

  if (row.url) {
    note.url = row.url
  }

  return note
}

/** Проверяет, что папка существует; `null` — папки нет. */
export async function folderExists(db: Database, folderId: string): Promise<boolean> {
  const row = await db.first<{ id: string }>('SELECT id FROM folders WHERE id = ?', folderId)

  return row !== null
}

/** Гарантирует служебную папку `ai-voult` (на случай чистой базы без миграции). */
export async function ensureAiFolder(db: Database): Promise<void> {
  await db.run(
    `INSERT INTO folders (id, name, slug, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (id) DO NOTHING`,
    AI_FOLDER_ID,
    AI_FOLDER_ID,
    AI_FOLDER_ID,
    new Date().toISOString(),
  )
}

/** Создаёт заметку и возвращает её серверное представление. */
export async function createNote(
  db: Database,
  input: {
    title: string
    content: string
    folderId?: string | null
    itemId?: string | null
    url?: string | null
  },
): Promise<Note> {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  await db.run(
    `INSERT INTO notes (id, folder_id, item_id, title, content, url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.folderId ?? null,
    input.itemId ?? null,
    input.title,
    input.content,
    input.url ?? null,
    now,
    now,
  )

  const row = await db.first<NoteRow>('SELECT * FROM notes WHERE id = ?', id)

  if (!row) {
    throw createError({ statusCode: 500, message: 'Заметка не создалась' })
  }

  return toNote(row)
}

/** База данных из события (сахар, чтобы роуты не импортировали `getDatabase`). */
export function dbOf(event: H3Event): Database {
  return getDatabase(event)
}

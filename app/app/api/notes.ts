/**
 * Клиентские обёртки над `/api/notes` и `/api/folders`.
 * Заметка/файл — одна сущность `Note`: название, контент, папка, ссылка на карточку.
 */
import type { Card } from '~/types/card'
import { apiFetch, type ApiBase } from './client'

/** Заметка, как её отдаёт бэкенд. */
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

export interface Folder {
  id: string
  name: string
  slug?: string
  /** Корневая папка «Мои знания»: всегда есть у авторизованного пользователя. */
  isRoot?: boolean
  /** Родитель для вложенных папок; у верхних `null`. */
  parentId?: string | null
  /** Доска папки (у верхних папок есть всегда). */
  boardId?: string | null
  createdAt: string
}

interface NotesResponse {
  notes: Note[]
}

interface NoteResponse {
  note: Note
}

interface FoldersResponse {
  folders: Folder[]
  /** `true`, если сервер вернул корень «Мои знания». */
  hasRoot?: boolean
}

/** Список заметок, при необходимости — по папке или по карточке. */
export async function fetchNotes(
  base: ApiBase,
  filter: { folderId?: string; itemId?: string } = {},
): Promise<Note[]> {
  const res = await apiFetch<NotesResponse>(base, '/api/notes', {
    query: {
      ...(filter.folderId ? { folderId: filter.folderId } : {}),
      ...(filter.itemId ? { itemId: filter.itemId } : {}),
    },
  })

  return Array.isArray(res.notes) ? res.notes : []
}

/** Одна заметка по id. */
export async function fetchNote(base: ApiBase, id: string): Promise<Note> {
  const res = await apiFetch<NoteResponse>(base, `/api/notes/${encodeURIComponent(id)}`)

  return res.note
}

/** Создаёт заметку. */
export async function createNote(
  base: ApiBase,
  payload: {
    title: string
    content: string
    folderId?: string | null
    itemId?: string | null
    url?: string | null
  },
): Promise<Note> {
  const res = await apiFetch<NoteResponse>(base, '/api/notes', {
    method: 'POST',
    body: payload,
  })

  return res.note
}

/** Правит заметку (название, контент, папка). */
export async function updateNote(
  base: ApiBase,
  id: string,
  patch: { title?: string; content?: string; folderId?: string | null },
): Promise<Note> {
  const res = await apiFetch<NoteResponse>(base, `/api/notes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  })

  return res.note
}

/** Удаляет заметку. */
export async function deleteNote(base: ApiBase, id: string): Promise<void> {
  await apiFetch(base, `/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/**
 * Создаёт папку. `id` не передаётся: сервер делает его персональным
 * (префикс владельца), чтобы одноимённые папки разных людей не конфликтовали.
 */
export async function createFolder(
  base: ApiBase,
  payload: { name: string },
): Promise<Folder> {
  const res = await apiFetch<{ folder: Folder }>(base, '/api/folders', {
    method: 'POST',
    body: payload,
  })

  return res.folder
}

/** Копирует папку вместе с доской и заметками; возвращает копию. */
export async function copyFolder(base: ApiBase, id: string): Promise<Folder> {
  const res = await apiFetch<{ folder: Folder }>(base, `/api/folders/${encodeURIComponent(id)}/copy`, {
    method: 'POST',
  })

  return res.folder
}

/** Удаляет папку: заметки остаются и переезжают в корень. */
export async function deleteFolder(base: ApiBase, id: string): Promise<void> {
  await apiFetch(base, `/api/folders/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Папки базы знаний: «Мои знания» и созданные пользователем. */
export async function fetchFolders(base: ApiBase): Promise<Folder[]> {
  const res = await apiFetch<FoldersResponse>(base, '/api/folders')

  return Array.isArray(res.folders) ? res.folders : []
}

/** Заголовок и текст заметки по карточке: название + описание/ссылка. */
export function noteFromCard(card: Card): { title: string; content: string } {
  const lines: string[] = []
  const body = card.summary?.trim() || card.content?.trim()

  if (body) {
    lines.push(body, '')
  }

  if (card.url) {
    lines.push(`Источник: ${card.url}`)
  }

  if (lines.length === 0) {
    lines.push('Без описания')
  }

  return { title: card.title, content: lines.join('\n').trim() }
}

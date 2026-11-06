/**
 * Клиентские обёртки над `/api/notes` и `/api/folders`.
 * Заметка/файл — одна сущность `Note`: название, контент, папка, ссылка на карточку.
 */
import type { Card } from '~/types/card'

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
  createdAt: string
}

/** Служебная папка, куда ИИ кладёт саммари. */
export const AI_FOLDER_ID = 'ai-voult'

interface NotesResponse {
  notes: Note[]
}

interface NoteResponse {
  note: Note
}

interface FoldersResponse {
  folders: Folder[]
}

/** Список заметок, при необходимости — по папке или по карточке. */
export async function fetchNotes(filter: { folderId?: string; itemId?: string } = {}): Promise<Note[]> {
  const res = await $fetch<NotesResponse>('/api/notes', {
    query: {
      ...(filter.folderId ? { folderId: filter.folderId } : {}),
      ...(filter.itemId ? { itemId: filter.itemId } : {}),
    },
  })

  return Array.isArray(res.notes) ? res.notes : []
}

/** Одна заметка по id. */
export async function fetchNote(id: string): Promise<Note> {
  const res = await $fetch<NoteResponse>(`/api/notes/${encodeURIComponent(id)}`)

  return res.note
}

/** Создаёт заметку. */
export async function createNote(payload: {
  title: string
  content: string
  folderId?: string | null
  itemId?: string | null
  url?: string | null
}): Promise<Note> {
  const res = await $fetch<NoteResponse>('/api/notes', {
    method: 'POST',
    body: payload,
  })

  return res.note
}

/** Правит заметку (название, контент, папка). */
export async function updateNote(
  id: string,
  patch: { title?: string; content?: string; folderId?: string | null },
): Promise<Note> {
  const res = await $fetch<NoteResponse>(`/api/notes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  })

  return res.note
}

/** Удаляет заметку. */
export async function deleteNote(id: string): Promise<void> {
  await $fetch(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Папки базы знаний (по умолчанию одна — `ai-voult`). */
export async function fetchFolders(): Promise<Folder[]> {
  const res = await $fetch<FoldersResponse>('/api/folders')

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

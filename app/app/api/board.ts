/**
 * Доска конкретной папки: `/api/boards/:folderId`.
 *
 * Каждая папка верхнего уровня имеет свою доску, поэтому и чтение,
 * и сохранение позиций адресуются через `folderId`.
 */
import { apiFetch, type ApiBase } from './client'

export interface BoardNode {
  id: string
  itemId?: string
  noteId?: string
  x: number
  y: number
  width?: number
  height?: number
  updatedAt: string
}

export interface BoardPayload {
  id: string
  folderId: string
  nodes: BoardNode[]
}

interface BoardResponse {
  board: BoardPayload
}

/** Доска папки (создаётся при первом обращении). */
export async function fetchBoard(base: ApiBase, folderId: string): Promise<BoardPayload> {
  const res = await apiFetch<BoardResponse>(base, `/api/boards/${encodeURIComponent(folderId)}`)

  return res.board
}

/** Сохраняет позицию узла (узел создаётся при первом сохранении). */
export async function saveBoardNode(
  base: ApiBase,
  folderId: string,
  key: string,
  patch: { x: number; y: number; width?: number; height?: number },
): Promise<void> {
  await apiFetch(
    base,
    `/api/boards/${encodeURIComponent(folderId)}/nodes/${encodeURIComponent(key)}`,
    { method: 'PATCH', body: patch },
  )
}

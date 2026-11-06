/**
 * Клиентские обёртки над доской: `/api/board` хранит позиции узлов
 * (карточек и заметок-файлов) в D1.
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

interface BoardResponse {
  nodes: BoardNode[]
}

/** Все узлы доски. */
export async function fetchBoard(base: ApiBase): Promise<BoardNode[]> {
  const res = await apiFetch<BoardResponse>(base, '/api/board')

  return Array.isArray(res.nodes) ? res.nodes : []
}

/**
 * Сохраняет позицию узла. `key` — id карточки или заметки.
 * Вызывается по окончании перетаскивания, поэтому ошибки не всплывают в UI.
 */
export async function saveBoardNode(
  base: ApiBase,
  key: string,
  patch: { x: number; y: number; width?: number; height?: number },
): Promise<void> {
  await apiFetch(base, `/api/board/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: patch,
  })
}

/** Данные главной: свои папки-доски и публичные доски. */
import { apiFetch, type ApiBase } from './client'

export interface HomeFolder {
  id: string
  name: string
  /** Ссылка на превью доски (может не быть). */
  preview: string | null
  boardId: string | null
  /** Заметок в папке. */
  files: number
  /** Карточек на доске. */
  cards: number
  /** Публичная ссылка, если папка/доска уже опубликована. */
  shareSlug: string | null
}

export interface HomePublicBoard {
  slug: string
  title: string
  preview: string | null
  author: string
  files: number
  kind: string
  createdAt: string
}

interface HomeResponse {
  folders: HomeFolder[]
  publicBoards: HomePublicBoard[]
}

/** Свои и публичные доски для главной страницы. */
export async function fetchHome(base: ApiBase): Promise<HomeResponse> {
  const res = await apiFetch<HomeResponse>(base, '/api/boards')

  return {
    folders: Array.isArray(res.folders) ? res.folders : [],
    publicBoards: Array.isArray(res.publicBoards) ? res.publicBoards : [],
  }
}

/**
 * Публичные подборки: выдача ссылки на папку/доску и отзыв.
 * Ссылка вида `/b/<slug>` открывается без входа.
 */
import { apiFetch, type ApiBase } from './client'

export interface Share {
  slug: string
  kind: 'folder' | 'board'
  refId: string | null
  url: string
}

interface ShareResponse {
  share: Share
}

/** Публикует папку (или доску) и возвращает ссылку. Повторный вызов — та же ссылка. */
export async function createShare(
  base: ApiBase,
  payload: { kind: 'folder' | 'board'; refId?: string },
): Promise<Share> {
  const res = await apiFetch<ShareResponse>(base, '/api/shares', {
    method: 'POST',
    body: payload,
  })

  return res.share
}

/** Отзывает ссылку. */
export async function revokeShare(base: ApiBase, slug: string): Promise<void> {
  await apiFetch(base, `/api/shares/${encodeURIComponent(slug)}`, { method: 'DELETE' })
}

/**
 * Клиентские обёртки над бэкендом карточек (`/api/items`).
 * Вызывать только на клиенте: SSR-разметка должна оставаться пустой.
 */
import type { Card, CardType } from '~/types/card'
import { apiFetch, type ApiBase } from './client'

/**
 * База для запросов к API. Пустая строка — тот же origin, иначе — абсолютный
 * адрес из `NUXT_PUBLIC_API_BASE` (см. `app/api/client.ts`).
 *
 * База приходит параметром из composable: `useRuntimeConfig()` доступен только
 * внутри Nuxt-контекста, а этот модуль вызывается и из обычных функций.
 */
export type { ApiBase }

/** Ответ `GET /api/items`. */
interface ItemsResponse {
  items: Card[]
}

/** Ответ `POST /api/items`. */
interface ItemResponse {
  item: Card
}

/** Тело `POST /api/items`. Ссылка необязательна только для заметок. */
export interface CreateItemPayload {
  type?: CardType
  url?: string
  title?: string
  thumbnail?: string
  summary?: string
  content?: string
  fileId?: string
}

/** Тело `PATCH /api/items/:id`: любое подмножество полей карточки. */
export type UpdateItemPayload = CreateItemPayload

/**
 * Список карточек (новые первыми).
 *
 * ВАЖНО: всё идёт через `apiFetch`, потому что только он добавляет
 * `Authorization: Bearer` (сессия натива) и `X-OpenRouter-Key`.
 * Прямой `$fetch` уходил без токена — в приложении возвращался только
 * публичный слой карточек.
 */
export async function fetchItems(base: ApiBase, limit = 200): Promise<Card[]> {
  const res = await apiFetch<ItemsResponse>(base, '/api/items', {
    query: { limit },
  })

  return Array.isArray(res.items) ? res.items : []
}

/** Создаёт карточку и возвращает её серверное представление (с id и createdAt из БД). */
export async function createItem(base: ApiBase, payload: CreateItemPayload): Promise<Card> {
  const res = await apiFetch<ItemResponse>(base, '/api/items', {
    method: 'POST',
    body: payload,
  })

  return res.item
}

/** Частично обновляет карточку (например, сохраняет саммари) и возвращает её. */
export async function updateItem(
  base: ApiBase,
  id: string,
  patch: UpdateItemPayload,
): Promise<Card> {
  const res = await apiFetch<ItemResponse>(base, `/api/items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  })

  return res.item
}

/** Удаляет карточку. Бросает при не-2xx. */
export async function deleteItem(base: ApiBase, id: string): Promise<void> {
  await apiFetch(base, `/api/items/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

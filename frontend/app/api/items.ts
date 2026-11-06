/**
 * Клиентские обёртки над бэкендом карточек (`/api/items`, Fastify через прокси Nuxt).
 * Вызывать только на клиенте: SSR-разметка должна оставаться пустой.
 */
import type { Card, CardType } from '~/types/card'

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

/** Список карточек (новые первыми). */
export async function fetchItems(limit = 200): Promise<Card[]> {
  const res = await $fetch<ItemsResponse>('/api/items', {
    query: { limit },
  })

  return Array.isArray(res.items) ? res.items : []
}

/** Создаёт карточку и возвращает её серверное представление (с id и createdAt из БД). */
export async function createItem(payload: CreateItemPayload): Promise<Card> {
  const res = await $fetch<ItemResponse>('/api/items', {
    method: 'POST',
    body: payload,
  })

  return res.item
}

/** Частично обновляет карточку (например, сохраняет саммари) и возвращает её. */
export async function updateItem(
  id: string,
  patch: UpdateItemPayload,
): Promise<Card> {
  const res = await $fetch<ItemResponse>(`/api/items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  })

  return res.item
}

/** Удаляет карточку. Бросает при не-2xx. */
export async function deleteItem(id: string): Promise<void> {
  await $fetch(`/api/items/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

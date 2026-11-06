// Карточки (items) в D1 — общая логика для Nitro-роутов.

/** Типы карточек, поддерживаемые фронтендом (см. `~/types/card`). */
export const TYPES = ['youtube', 'tiktok', 'article', 'note'] as const

export type ItemType = (typeof TYPES)[number]

/** Типы, для которых ссылка обязательна. */
const LINKED_TYPES: ReadonlySet<ItemType> = new Set(['youtube', 'tiktok', 'article'])

export interface Item {
  id: string
  type: ItemType
  url?: string
  title: string
  thumbnail?: string
  summary?: string
  content?: string
  fileId?: string
  createdAt: string
  updatedAt: string
}

export interface ItemRow {
  id: string
  type: ItemType
  url: string | null
  title: string
  thumbnail: string | null
  summary: string | null
  content: string | null
  file_id: string | null
  created_at: string
  updated_at: string
}

export interface ItemBody {
  type?: string
  url?: string
  title?: string
  thumbnail?: string
  summary?: string
  content?: string
  fileId?: string
}

/** Колонка БД ← поле JSON (для PATCH). */
export const PATCH_COLUMNS: Readonly<Record<string, string>> = {
  type: 'type',
  url: 'url',
  title: 'title',
  thumbnail: 'thumbnail',
  summary: 'summary',
  content: 'content',
  fileId: 'file_id',
}

/** Поля, которые нельзя обнулить. */
const NOT_NULLABLE: ReadonlySet<string> = new Set(['title'])

/** Многострочные поля: пробелы не обрезаем, пустую строку не отсекаем. */
export const TEXT_FIELDS: ReadonlySet<string> = new Set(['content'])

/** Строка БД → JSON в camelCase (пустые поля не отдаём). */
export function toItem(row: ItemRow): Item {
  const item: Item = {
    id: row.id,
    type: row.type,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  }

  if (row.url) {
    item.url = row.url
  }

  if (row.thumbnail) {
    item.thumbnail = row.thumbnail
  }

  if (row.summary) {
    item.summary = row.summary
  }

  if (row.content) {
    item.content = row.content
  }

  if (row.file_id) {
    item.fileId = row.file_id
  }

  return item
}

/** Только http(s)-ссылки. */
function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)

    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** Нормализует необязательную строку: `undefined` для пустого значения. */
export function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : undefined
}

/** Проверка типа карточки. */
export function parseType(value: unknown): ItemType | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const type = String(value) as ItemType

  if (!TYPES.includes(type)) {
    throw createError({ statusCode: 400, message: 'Неизвестный тип' })
  }

  return type
}

/**
 * Проверка ссылки относительно типа: у youtube/tiktok/article она обязательна,
 * у заметки — необязательна, но если передана, должна быть http(s).
 */
export function parseUrl(value: unknown, type: ItemType): string | undefined {
  const url = value === undefined || value === null ? undefined : optionalText(String(value))

  if (url === undefined) {
    if (LINKED_TYPES.has(type)) {
      throw createError({ statusCode: 400, message: 'Некорректная ссылка' })
    }

    return undefined
  }

  if (!isHttpUrl(url)) {
    throw createError({ statusCode: 400, message: 'Некорректная ссылка' })
  }

  return url
}

/** Обязательна ли ссылка для типа. */
export function needsUrl(type: ItemType): boolean {
  return LINKED_TYPES.has(type)
}

/** Название поля, которое нельзя сбросить в null. */
export function isNotNullable(field: string): boolean {
  return NOT_NULLABLE.has(field)
}

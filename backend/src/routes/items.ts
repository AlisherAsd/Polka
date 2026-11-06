// Карточки (items) в D1: список, создание, правка и удаление.
import type { FastifyPluginAsync } from 'fastify'
import { HttpError } from '../lib/openrouter.ts'
import { getDatabase } from '../lib/db.ts'

/** Типы карточек, поддерживаемые фронтендом (см. frontend/app/types/card.ts). */
const TYPES = ['youtube', 'tiktok', 'article', 'note'] as const

/** Типы, для которых ссылка обязательна. */
const LINKED_TYPES: ReadonlySet<ItemType> = new Set(['youtube', 'tiktok', 'article'])

type ItemType = (typeof TYPES)[number]

interface Item {
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

interface ItemRow {
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

interface ItemBody {
  type?: string
  url?: string
  title?: string
  thumbnail?: string
  summary?: string
  content?: string
  fileId?: string
}

/** Колонка БД ← поле JSON (для PATCH). */
const PATCH_COLUMNS: Readonly<Record<string, string>> = {
  type: 'type',
  url: 'url',
  title: 'title',
  thumbnail: 'thumbnail',
  summary: 'summary',
  content: 'content',
  fileId: 'file_id',
}

/** Поля, которые нельзя обнулить: title всегда, url — у ссылочных типов. */
const NOT_NULLABLE: ReadonlySet<string> = new Set(['title'])

/** Многострочные поля: пробелы не обрезаем, пустую строку не отсекаем. */
const TEXT_FIELDS: ReadonlySet<string> = new Set(['content'])

/** Строка БД → JSON в camelCase (пустые поля не отдаём). */
function toItem(row: ItemRow): Item {
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
function optionalText(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : undefined
}

/** Проверка типа карточки. */
function parseType(value: unknown): ItemType | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const type = String(value) as ItemType

  if (!TYPES.includes(type)) {
    throw new HttpError(400, 'Неизвестный тип')
  }

  return type
}

/**
 * Проверка ссылки относительно типа: у youtube/tiktok/article она обязательна,
 * у заметки — необязательна, но если передана, должна быть http(s).
 */
function parseUrl(value: unknown, type: ItemType): string | undefined {
  // `undefined` (поле не передано) и `null` одинаково означают «ссылки нет»:
  // раньше `String(undefined)` давал строку "undefined" и валидную проверку не проходил.
  const url = value === undefined || value === null ? undefined : optionalText(String(value))

  if (url === undefined) {
    if (LINKED_TYPES.has(type)) {
      throw new HttpError(400, 'Некорректная ссылка')
    }

    return undefined
  }

  if (!isHttpUrl(url)) {
    throw new HttpError(400, 'Некорректная ссылка')
  }

  return url
}

export const itemsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { limit?: string } }>('/api/items', async (request) => {
    const raw = Number(request.query?.limit ?? 100)
    const limit = Number.isFinite(raw) ? Math.min(500, Math.max(1, Math.trunc(raw))) : 100

    const db = await getDatabase()
    const rows = await db.all<ItemRow>(
      'SELECT * FROM items ORDER BY created_at DESC, rowid DESC LIMIT ?',
      limit,
    )

    return { items: rows.map(toItem) }
  })

  app.post<{ Body: ItemBody }>('/api/items', async (request, reply) => {
    const body = request.body ?? {}
    const type: ItemType = parseType(body.type) ?? 'article'
    const url = parseUrl(body.url, type)
    const now = new Date().toISOString()

    const item: Item = {
      id: crypto.randomUUID(),
      type,
      title: optionalText(body.title) ?? url ?? 'Без названия',
      createdAt: now,
      updatedAt: now,
    }

    if (url) {
      item.url = url
    }

    const thumbnail = optionalText(body.thumbnail)
    const summary = optionalText(body.summary)
    // `content` — транскрипт/текст: сохраняем как есть, пустую строку не отсекаем.
    const content = typeof body.content === 'string' ? body.content : undefined
    const fileId = optionalText(body.fileId)

    if (thumbnail) {
      item.thumbnail = thumbnail
    }

    if (summary) {
      item.summary = summary
    }

    if (content !== undefined) {
      item.content = content
    }

    if (fileId) {
      item.fileId = fileId
    }

    const db = await getDatabase()

    await db.run(
      `INSERT INTO items (id, type, url, title, thumbnail, summary, content, file_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      item.id,
      item.type,
      item.url ?? null,
      item.title,
      item.thumbnail ?? null,
      item.summary ?? null,
      item.content ?? null,
      item.fileId ?? null,
      item.createdAt,
      item.updatedAt,
    )

    return reply.code(201).send({ item })
  })

  /**
   * Частичное обновление. Обновляет только переданные поля и всегда
   * проставляет `updated_at` — сюда пишется саммари от ИИ.
   */
  app.patch<{ Params: { id: string }; Body: ItemBody }>('/api/items/:id', async (request) => {
    const body = request.body ?? {}
    const db = await getDatabase()
    const current = await db.first<ItemRow>('SELECT * FROM items WHERE id = ?', request.params.id)

    if (!current) {
      throw new HttpError(404, 'Карточка не найдена')
    }

    // Тип и ссылка проверяются вместе: смена типа может сделать ссылку обязательной.
    const type = parseType(body.type) ?? current.type
    const sets: string[] = []
    const values: unknown[] = []

    if (body.type !== undefined) {
      sets.push('type = ?')
      values.push(type)
    }

    if (body.url !== undefined) {
      const url = parseUrl(body.url, type)
      sets.push('url = ?')
      values.push(url ?? null)
    } else if (body.type !== undefined && LINKED_TYPES.has(type) && !current.url) {
      throw new HttpError(400, 'Некорректная ссылка')
    }

    for (const [field, column] of Object.entries(PATCH_COLUMNS)) {
      if (field === 'type' || field === 'url' || !(field in body)) {
        continue
      }

      const raw = (body as Record<string, unknown>)[field]
      const value = TEXT_FIELDS.has(field)
        ? (typeof raw === 'string' && raw.length > 0 ? raw : undefined)
        : optionalText(raw === null || raw === undefined ? undefined : String(raw))

      if (value === undefined && NOT_NULLABLE.has(field)) {
        continue
      }

      sets.push(`${column} = ?`)
      values.push(value ?? null)
    }

    sets.push('updated_at = ?')
    values.push(new Date().toISOString(), request.params.id)

    await db.run(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`, ...values)

    const row = await db.first<ItemRow>('SELECT * FROM items WHERE id = ?', request.params.id)

    if (!row) {
      throw new HttpError(404, 'Карточка не найдена')
    }

    return { item: toItem(row) }
  })

  app.delete<{ Params: { id: string } }>('/api/items/:id', async (request, reply) => {
    const db = await getDatabase()
    const changes = await db.run('DELETE FROM items WHERE id = ?', request.params.id)

    if (changes === 0) {
      throw new HttpError(404, 'Карточка не найдена')
    }

    return reply.code(204).send()
  })
}

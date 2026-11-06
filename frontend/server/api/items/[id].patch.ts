// PATCH /api/items/:id — частичное обновление карточки.
// Обновляет только переданные поля и всегда проставляет `updated_at` —
// сюда же пишется саммари от ИИ.
import { getDatabase } from '../../utils/db'
import {
  isNotNullable,
  needsUrl,
  optionalText,
  parseType,
  parseUrl,
  PATCH_COLUMNS,
  toItem,
  TEXT_FIELDS,
  type ItemBody,
  type ItemRow,
} from '../../utils/items'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const body = (await readBody<ItemBody>(event)) ?? {}
  const db = getDatabase(event)

  const current = await db.first<ItemRow>('SELECT * FROM items WHERE id = ?', id)

  if (!current) {
    throw createError({ statusCode: 404, message: 'Карточка не найдена' })
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
  } else if (body.type !== undefined && needsUrl(type) && !current.url) {
    throw createError({ statusCode: 400, message: 'Некорректная ссылка' })
  }

  for (const [field, column] of Object.entries(PATCH_COLUMNS)) {
    if (field === 'type' || field === 'url' || !(field in body)) {
      continue
    }

    const raw = (body as Record<string, unknown>)[field]
    const value = TEXT_FIELDS.has(field)
      ? (typeof raw === 'string' && raw.length > 0 ? raw : undefined)
      : optionalText(raw)

    if (value === undefined && isNotNullable(field)) {
      continue
    }

    sets.push(`${column} = ?`)
    values.push(value ?? null)
  }

  sets.push('updated_at = ?')
  values.push(new Date().toISOString(), id)

  await db.run(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`, ...values)

  const row = await db.first<ItemRow>('SELECT * FROM items WHERE id = ?', id)

  if (!row) {
    throw createError({ statusCode: 404, message: 'Карточка не найдена' })
  }

  return { item: toItem(row) }
})

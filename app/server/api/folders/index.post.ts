// POST /api/folders — создать папку верхнего уровня вместе с её доской.
// Тело: { name: string }. Ответ: `{ folder }` с `boardId`.
import { dbOf } from '../../utils/notes'
import { ensureBoard, listFolders } from '../../utils/workspaces'
import { scopeFor } from '../../utils/scope'
import { optionalText } from '../../utils/items'

/** Читабельный id из названия; для кириллицы — короткий хэш. */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (slug.length > 0) {
    return slug
  }

  let hash = 0

  for (const char of name) {
    hash = (hash * 31 + char.codePointAt(0)!) % 0xffffffff
  }

  return `folder-${hash.toString(36)}`
}

export default defineEventHandler(async (event) => {
  const body = (await readBody<{ name?: string }>(event)) ?? {}
  const name = optionalText(body.name)

  if (!name) {
    throw createError({ statusCode: 400, message: 'Не указано название папки' })
  }

  const scope = await scopeFor(event)

  if (!scope.userId) {
    throw createError({ statusCode: 401, message: 'Нужен вход' })
  }

  const db = dbOf(event)
  const baseId = slugify(name)
  const id = `${baseId}-${scope.userId.slice(0, 8)}`
  const now = new Date().toISOString()

  const existing = await db.first<{ id: string }>(
    'SELECT id FROM folders WHERE id = ? AND user_id = ?',
    id,
    scope.userId,
  )

  if (existing) {
    throw createError({ statusCode: 409, message: 'Папка с таким названием уже есть' })
  }

  // Верхняя папка: parent_id = NULL — значит, у неё есть своя доска.
  await db.run(
    'INSERT INTO folders (id, name, slug, created_at, user_id, is_root, parent_id) VALUES (?, ?, ?, ?, ?, 0, NULL)',
    id,
    name,
    id,
    now,
    scope.userId,
  )

  await ensureBoard(db, scope.userId, id)

  const folders = await listFolders(db, scope.userId)
  const folder = folders.find((item) => item.id === id) ?? null

  setResponseStatus(event, 201)

  return { folder }
})

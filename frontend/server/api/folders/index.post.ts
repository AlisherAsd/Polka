// POST /api/folders — создать папку. Тело: { name: string, id?: string }.
// `id` передаёт фронт: дерево папок моковое и id узлов заданы заранее.
// Повторный вызов с тем же id идемпотентен — вернёт существующую папку.
import { toFolder, type FolderRow } from '../../utils/notes'
import { optionalText } from '../../utils/items'

/**
 * id папки для новых папок. Для латиницы получается читаемый slug,
 * для кириллицы — короткий стабильный хэш (папка создаётся один раз,
 * `SetFolder` на фронте вызывает этот роут идемпотентно).
 */
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
  const body = (await readBody<{ name?: string; id?: string }>(event)) ?? {}
  const name = optionalText(body.name)

  if (!name) {
    throw createError({ statusCode: 400, message: 'Не указано название папки' })
  }

  const db = dbOf(event)
  // `id` приходит с фронта, где дерево папок моковое и id заданы заранее.
  const id = optionalText(body.id) ?? slugify(name)
  const now = new Date().toISOString()

  const existing = await db.first<FolderRow>('SELECT * FROM folders WHERE id = ?', id)

  if (existing) {
    // Повторный вызов — идемпотентен: папка уже есть, отдаём её.
    return { folder: toFolder(existing) }
  }

  await db.run(
    'INSERT INTO folders (id, name, slug, created_at) VALUES (?, ?, ?, ?)',
    id,
    name,
    id,
    now,
  )

  const row = await db.first<FolderRow>('SELECT * FROM folders WHERE id = ?', id)

  setResponseStatus(event, 201)

  return { folder: row ? toFolder(row) : null }
})

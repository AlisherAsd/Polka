// POST /api/shares — опубликовать папку или доску, получить ссылку.
// Тело: { kind: 'folder' | 'board', refId?: string }. Ответ: { share: { slug, url, kind, refId } }.
import { getDatabase } from '../../utils/db'
import { getOrCreateShare } from '../../utils/shares'
import { scopeFor } from '../../utils/scope'
import { optionalText } from '../../utils/items'

export default defineEventHandler(async (event) => {
  const body = (await readBody<{ kind?: string; refId?: string }>(event)) ?? {}
  const kind = body.kind === 'board' ? 'board' : body.kind === 'folder' ? 'folder' : null
  const refId = optionalText(body.refId) ?? null

  if (!kind) {
    throw createError({ statusCode: 400, message: 'Неизвестный тип подборки' })
  }

  const scope = await scopeFor(event)

  if (!scope.userId) {
    throw createError({ statusCode: 401, message: 'Нужен вход' })
  }

  const db = getDatabase(event)

  // Папку можно опубликовать только свою.
  if (kind === 'folder') {
    if (!refId) {
      throw createError({ statusCode: 400, message: 'Не указана папка' })
    }

    const folder = await db.first<{ id: string }>(
      'SELECT id FROM folders WHERE id = ? AND user_id = ?',
      refId,
      scope.userId,
    )

    if (!folder) {
      throw createError({ statusCode: 404, message: 'Папка не найдена' })
    }
  }

  // Для доски `refId` — это `boards.id`: проверяем, что доска своя.
  if (kind === 'board') {
    if (!refId) {
      throw createError({ statusCode: 400, message: 'Не указана доска' })
    }

    const board = await db.first<{ id: string }>(
      'SELECT id FROM boards WHERE id = ? AND user_id = ?',
      refId,
      scope.userId,
    )

    if (!board) {
      throw createError({ statusCode: 404, message: 'Доска не найдена' })
    }
  }

  const share = await getOrCreateShare(db, scope.userId, kind, refId)

  setResponseStatus(event, 201)

  return {
    share: {
      slug: share.slug,
      kind: share.kind,
      refId: share.ref_id,
      url: `/b/${share.slug}`,
    },
  }
})

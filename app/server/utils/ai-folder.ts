// Папка ИИ (`ai-voult`) — обычная папка верхнего уровня со своей доской.
//
// Раньше она была скрытой служебной записью с `user_id IS NULL`; теперь это
// такая же папка пользователя, как «Мои знания», только создаётся автоматически
// и её нельзя удалить.
import type { Database } from './db'
import { ensureBoard } from './workspaces'

export const AI_FOLDER_NAME = 'ai-voult'

/** Возвращает id папки `ai-voult` пользователя, создавая её и доску при необходимости. */
export async function ensureUserAiFolder(db: Database, userId: string): Promise<string> {
  const existing = await db.first<{ id: string }>(
    'SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id IS NULL',
    userId,
    AI_FOLDER_NAME,
  )

  if (existing) {
    await ensureBoard(db, userId, existing.id)

    return existing.id
  }

  const id = `ai-voult-${userId.slice(0, 8)}`
  const now = new Date().toISOString()

  await db.run(
    `INSERT INTO folders (id, name, slug, created_at, user_id, is_root, parent_id)
     VALUES (?, ?, ?, ?, ?, 0, NULL)`,
    id,
    AI_FOLDER_NAME,
    id,
    now,
    userId,
  )

  await ensureBoard(db, userId, id)

  return id
}

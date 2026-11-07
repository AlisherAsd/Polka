// POST /api/auth/premium — «купить премиум».
//
// Платёжного провайдера пока нет: ручка просто включает флаг `is_premium`
// у текущего пользователя. Позже сюда добавится проверка оплаты.
import { getDatabase } from '../../utils/db'
import { toPublicUser, type UserRow } from '../../utils/auth'
import { userFromEvent } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await userFromEvent(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const db = getDatabase(event)

  await db.run('UPDATE users SET is_premium = 1 WHERE id = ?', user.id)

  return { user: toPublicUser({ ...user, is_premium: 1 }) }
})

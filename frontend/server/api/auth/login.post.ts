// POST /api/auth/login — вход по email и паролю.
// Ответ: `{ user, token, expiresAt }` + httpOnly cookie сессии.
import { getDatabase } from '../../utils/db'
import { toPublicUser, verifyPassword, type UserRow } from '../../utils/auth'
import { createSession, setSessionCookie } from '../../utils/session'
import { optionalText } from '../../utils/items'

export default defineEventHandler(async (event) => {
  const body = (await readBody<{ email?: string; password?: string }>(event)) ?? {}
  const email = (optionalText(body.email) ?? '').toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  if (email.length === 0 || password.length === 0) {
    throw createError({ statusCode: 400, message: 'Укажите email и пароль' })
  }

  const db = getDatabase(event)
  const user = await db.first<UserRow>('SELECT * FROM users WHERE email = ?', email)

  // Один текст ошибки на оба случая — не подсказываем, существует ли аккаунт.
  if (!user || !(await verifyPassword(password, user))) {
    throw createError({ statusCode: 401, message: 'Неверный email или пароль' })
  }

  const { token, expiresAt } = await createSession(event, user.id)

  setSessionCookie(event, token)

  return { user: toPublicUser(user), token, expiresAt }
})

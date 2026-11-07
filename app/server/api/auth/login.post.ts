// POST /api/auth/login — вход по email и паролю.
// Ответ: `{ user, token, expiresAt }` + httpOnly cookie сессии.
import { getDatabase } from '../../utils/db'
import { toPublicUser, verifyPassword, type UserRow } from '../../utils/auth'
import { createSession, setSessionCookie } from '../../utils/session'
import { clientPlatform } from '../../utils/client-info'

export default defineEventHandler(async (event) => {
  const body = (await readBody<{
    email?: unknown
    password?: unknown
  }>(event)) ?? {}

  const rawEmail = body.email
  const rawPassword = body.password
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
  const password = typeof rawPassword === 'string' ? rawPassword : ''

  // Точные причины — в `wrangler tail`: без этого нативные ошибки невидимы.
  if (email.length === 0 || password.length === 0) {
    console.warn('[auth:login] пустые поля', {
      emailType: typeof rawEmail,
      passwordType: typeof rawPassword,
      passwordLength: password.length,
      platform: clientPlatform(event),
    })

    throw createError({ statusCode: 400, message: 'Укажите email и пароль' })
  }

  const db = getDatabase(event)
  const user = await db.first<UserRow>('SELECT * FROM users WHERE email = ?', email)

  if (!user) {
    console.warn('[auth:login] пользователь не найден', { email, platform: clientPlatform(event) })

    throw createError({ statusCode: 401, message: 'Неверный email или пароль' })
  }

  const ok = await verifyPassword(password, user)

  if (!ok) {
    console.warn('[auth:login] неверный пароль', { email, platform: clientPlatform(event) })

    throw createError({ statusCode: 401, message: 'Неверный email или пароль' })
  }

  const { token, expiresAt } = await createSession(event, user.id)

  setSessionCookie(event, token)

  return { user: toPublicUser(user), token, expiresAt }
})

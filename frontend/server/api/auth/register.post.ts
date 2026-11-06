// POST /api/auth/register — регистрация по email и паролю.
// Ответ: `{ user, token, expiresAt }` + httpOnly cookie сессии.
import { getDatabase } from '../../utils/db'
import {
  hashPassword,
  isValidEmail,
  PASSWORD_MIN_LENGTH,
  toPublicUser,
  type UserRow,
} from '../../utils/auth'
import { createSession, setSessionCookie } from '../../utils/session'
import { optionalText } from '../../utils/items'

export default defineEventHandler(async (event) => {
  const body = (await readBody<{ email?: string; password?: string }>(event)) ?? {}
  const email = (optionalText(body.email) ?? '').toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''

  if (!isValidEmail(email)) {
    throw createError({ statusCode: 400, message: 'Некорректный email' })
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw createError({
      statusCode: 400,
      message: `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов`,
    })
  }

  const db = getDatabase(event)
  const existing = await db.first<{ id: string }>('SELECT id FROM users WHERE email = ?', email)

  if (existing) {
    throw createError({ statusCode: 409, message: 'Такой email уже зарегистрирован' })
  }

  const { hash, salt, iterations } = await hashPassword(password)
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.run(
    `INSERT INTO users (id, email, password_hash, password_salt, iterations, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    email,
    hash,
    salt,
    iterations,
    now,
  )

  const user: UserRow = {
    id,
    email,
    password_hash: hash,
    password_salt: salt,
    iterations,
    is_premium: 0,
    created_at: now,
  }

  const { token, expiresAt } = await createSession(event, id)

  setSessionCookie(event, token)
  setResponseStatus(event, 201)

  return { user: toPublicUser(user), token, expiresAt }
})

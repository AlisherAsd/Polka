// Сессии: создание, чтение из запроса, удаление.
//
// Токен один на сессию и передаётся двумя способами:
//   * сайт — httpOnly cookie (JS токена не видит);
//   * нативное приложение — `Authorization: Bearer <token>`.
// В базе лежит только SHA-256 токена.
import type { H3Event } from 'h3'
import {
  randomToken,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  sha256,
  userAgentOf,
  type SessionRow,
  type UserRow,
} from './auth'
import { getDatabase } from './db'

/** Создаёт сессию и возвращает «сырой» токен (он показывается клиенту один раз). */
export async function createSession(
  event: H3Event,
  userId: string,
): Promise<{ token: string; expiresAt: string }> {
  const db = getDatabase(event)
  const token = randomToken(32)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString()

  await db.run(
    `INSERT INTO sessions (id, user_id, token_hash, user_agent, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    userId,
    await sha256(token),
    userAgentOf(event),
    now.toISOString(),
    expiresAt,
  )

  return { token, expiresAt }
}

/** Токен из заголовка `Authorization: Bearer` или из cookie. */
export function readToken(event: H3Event): string | null {
  const header = getHeader(event, 'authorization')

  if (header?.toLowerCase().startsWith('bearer ')) {
    const token = header.slice(7).trim()

    return token.length > 0 ? token : null
  }

  const cookie = getCookie(event, SESSION_COOKIE)

  return cookie && cookie.length > 0 ? cookie : null
}

/** Пользователь по токену из запроса; просроченные сессии не возвращаются. */
export async function userFromEvent(event: H3Event): Promise<UserRow | null> {
  const token = readToken(event)

  if (!token) {
    return null
  }

  const db = getDatabase(event)
  const hash = await sha256(token)
  const session = await db.first<SessionRow>(
    'SELECT * FROM sessions WHERE token_hash = ?',
    hash,
  )

  if (!session) {
    return null
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await db.run('DELETE FROM sessions WHERE id = ?', session.id)

    return null
  }

  return await db.first<UserRow>('SELECT * FROM users WHERE id = ?', session.user_id)
}

/** Ставит cookie сессии (сайт). Натив использует Bearer и cookie не нужен. */
export function setSessionCookie(event: H3Event, token: string): void {
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

/** Удаляет cookie сессии. */
export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax' })
}

/** Удаляет сессию по токену (выход). */
export async function destroySession(event: H3Event): Promise<void> {
  const token = readToken(event)

  if (!token) {
    return
  }

  const db = getDatabase(event)

  await db.run('DELETE FROM sessions WHERE token_hash = ?', await sha256(token))
}

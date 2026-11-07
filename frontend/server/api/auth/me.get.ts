// GET /api/auth/me — текущий пользователь по cookie или Bearer-токену.
import { toPublicUser } from '../../utils/auth'
import { userFromEvent } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await userFromEvent(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  console.log('[auth:me]', { userId: user.id, premium: Boolean(user.is_premium), platform: clientPlatform(event) })

  return { user: toPublicUser(user) }
})

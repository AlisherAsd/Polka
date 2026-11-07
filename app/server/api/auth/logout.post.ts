// POST /api/auth/logout — завершает текущую сессию и чистит cookie.
import { clearSessionCookie, destroySession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await destroySession(event)
  clearSessionCookie(event)

  setResponseStatus(event, 204)

  return null
})

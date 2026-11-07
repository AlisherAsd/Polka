// POST /api/auth/key — проверка собственного ключа OpenRouter.
//
// Ключ пользователя не сохраняется на сервере: клиент держит его в localStorage
// и присылает в заголовке `X-OpenRouter-Key`. Ручка нужна, чтобы проверить
// ключ и дать понятную ошибку ещё до запроса к модели.
import { checkKey } from '../../utils/openrouter'

export default defineEventHandler(async (event) => {
  const body = (await readBody<{ key?: string }>(event)) ?? {}
  const key = String(body.key ?? '').trim()

  if (key.length < 10) {
    throw createError({ statusCode: 400, message: 'Похоже, это не ключ OpenRouter' })
  }

  if (!(await checkKey(key))) {
    throw createError({ statusCode: 401, message: 'OpenRouter не принял ключ' })
  }

  return { ok: true }
})

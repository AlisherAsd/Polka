// Владение данными: каждый пользователь видит и меняет только свои записи.
//
// Правило одно и то же во всех ручках:
//   * строки с `user_id = <id>` — записи пользователя;
//   * строки с `user_id IS NULL` — «общие» (то, что было до привязки, плюс
//     служебная папка `ai-voult`);
//   * чужие записи (`user_id` другого пользователя) не видны никогда.
//
// Синтаксис одинаковый для выборок и мутаций: `scopeFor(event)` возвращает
// фрагмент SQL и его параметры.
import type { H3Event } from 'h3'
import { userFromEvent } from './session'

/** Владелец запроса; `null` — гость или истёкшая сессия. */
export async function currentUserId(event: H3Event): Promise<string | null> {
  const user = await userFromEvent(event)

  return user?.id ?? null
}

export interface Scope {
  /** `user_id = ?` или `(user_id = ? OR user_id IS NULL)`. */
  sql: string
  params: unknown[]
  /** Тот же фильтр с префиксом таблицы: `i.user_id = ?`. */
  prefixed: (alias: string) => string
}

/**
 * Фильтр по владельцу. Гость видит только «общие» записи (`user_id IS NULL`),
 * поэтому его данные не смешиваются с чужими.
 */
export function scopeOf(userId: string | null): Scope {
  const sql = userId ? '(user_id = ? OR user_id IS NULL)' : 'user_id IS NULL'

  return {
    sql,
    params: userId ? [userId] : [],
    prefixed: (alias: string) =>
      userId ? `(${alias}.user_id = ? OR ${alias}.user_id IS NULL)` : `${alias}.user_id IS NULL`,
  }
}

/** Владелец из запроса + готовый фильтр. */
export async function scopeFor(event: H3Event): Promise<Scope & { userId: string | null }> {
  const userId = await currentUserId(event)

  return { ...scopeOf(userId), userId }
}

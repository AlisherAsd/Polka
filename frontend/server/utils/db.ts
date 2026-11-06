// Доступ к D1 из Nitro-хендлеров воркера.
// В воркере база приходит биндингом `DB`; локально (nuxt dev) запросы уходят
// на Fastify через прокси, поэтому сюда не попадают.
import type { H3Event } from 'h3'

/** Только те методы D1, которые нужны роутам. */
export interface D1Like {
  prepare(query: string): {
    bind(...values: unknown[]): Statement
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
    first<T = Record<string, unknown>>(): Promise<T | null>
    run(): Promise<{ meta?: { changes?: number } }>
  }
}

interface Statement {
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<{ meta?: { changes?: number } }>
}

export interface Database {
  all<T = Record<string, unknown>>(query: string, ...params: unknown[]): Promise<T[]>
  first<T = Record<string, unknown>>(query: string, ...params: unknown[]): Promise<T | null>
  run(query: string, ...params: unknown[]): Promise<number>
}

/** Оборачивает D1-биндинг в минимальный интерфейс. */
function createDatabase(d1: D1Like): Database {
  const bind = (query: string, params: unknown[]) => {
    const stmt = d1.prepare(query)

    return params.length > 0 ? stmt.bind(...params) : stmt
  }

  return {
    async all<T>(query: string, ...params: unknown[]) {
      const { results } = await bind(query, params).all<T>()

      return results ?? []
    },

    async first<T>(query: string, ...params: unknown[]) {
      return (await bind(query, params).first<T>()) ?? null
    },

    async run(query: string, ...params: unknown[]) {
      const res = await bind(query, params).run()

      return res.meta?.changes ?? 0
    },
  }
}

/** Достаёт D1 из окружения воркера. */
export function getDatabase(event: H3Event): Database {
  const d1 = (event.context.cloudflare as { env?: { DB?: D1Like } } | undefined)?.env?.DB

  if (!d1) {
    throw createError({ statusCode: 500, message: 'D1 недоступен' })
  }

  return createDatabase(d1)
}

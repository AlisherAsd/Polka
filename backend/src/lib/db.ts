// Доступ к D1. Локально база поднимается через wrangler (getPlatformProxy),
// поэтому смена на remote — это замена провайдера, а не переписывание запросов.
import { getPlatformProxy } from 'wrangler'

/** Только те методы D1, которые реально нужны роутам. */
export interface D1Like {
  prepare(query: string): {
    bind(...values: unknown[]): {
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
      first<T = Record<string, unknown>>(): Promise<T | null>
      run(): Promise<{ meta?: { changes?: number } }>
    }
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
    first<T = Record<string, unknown>>(): Promise<T | null>
    run(): Promise<{ meta?: { changes?: number } }>
  }
}

export interface Database {
  all<T = Record<string, unknown>>(query: string, ...params: unknown[]): Promise<T[]>
  first<T = Record<string, unknown>>(query: string, ...params: unknown[]): Promise<T | null>
  run(query: string, ...params: unknown[]): Promise<number>
}

/** Адаптер над D1Database: подставляет bind() только когда есть параметры. */
export function createDatabase(db: D1Like): Database {
  const bind = (query: string, params: unknown[]) => {
    const stmt = db.prepare(query)

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

let database: Database | null = null

/** Ленивая инициализация: первый запрос поднимает прокси и открывает локальную D1. */
export async function getDatabase(): Promise<Database> {
  if (database) {
    return database
  }

  const { env } = await getPlatformProxy({ configPath: './wrangler.toml' })
  const db = (env as { DB?: D1Like }).DB

  if (!db) {
    throw new Error('D1 binding "DB" не найден в wrangler.toml')
  }

  database = createDatabase(db)

  return database
}

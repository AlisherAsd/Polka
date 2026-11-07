import { SITE_INDEX, type SiteEntry } from '~/data/siteIndex'

/**
 * Поиск по сайту: страницы, разделы руководства и действия.
 *
 * Работает целиком на клиенте — данных пользователя не касается.
 * Нормализация: нижний регистр, «ё» → «е», без пунктуации. Совпадения
 * ранжируются: начало заголовка → заголовок → ключевые слова → описание.
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Вес совпадения: чем больше, тем выше пункт. 0 — не совпало. */
function score(entry: SiteEntry, query: string): number {
  const title = normalize(entry.title)
  const description = normalize(entry.description ?? '')
  const keywords = (entry.keywords ?? []).map(normalize)

  if (title === query) {
    return 100
  }

  if (title.startsWith(query)) {
    return 80
  }

  // Совпадение внутри заголовка — тоже по началу слова: «чат» не должен
  // находить «С чего начать».
  if (title.split(' ').some((word) => word.startsWith(query))) {
    return 60
  }

  if (keywords.some((keyword) => keyword === query)) {
    return 50
  }

  if (keywords.some((keyword) => keyword.startsWith(query))) {
    return 40
  }

  // Подстрока в ключевом слове — только с начала слова: «чат» не должен
  // находиться внутри «начать»/«с чего начать».
  const wordStarts = keywords.some((keyword) =>
    keyword.split(' ').some((word) => word.startsWith(query)),
  )

  if (wordStarts) {
    return 30
  }

  if (description.includes(query)) {
    return 20
  }

  // Слова запроса по отдельности (например, «файлы панель»).
  const words = query.split(' ').filter((word) => word.length > 1)

  if (words.length > 1) {
    const haystack = `${title} ${description} ${keywords.join(' ')}`

    if (words.every((word) => haystack.includes(word))) {
      return 10
    }
  }

  return 0
}

/** Поиск в индексе. Пустой запрос возвращает часто нужные пункты. */
export function searchSite(query: string, limit = 12): SiteEntry[] {
  const normalized = normalize(query)

  if (normalized.length === 0) {
    // Подсказки по умолчанию: самые нужные действия и страницы.
    const defaults = ['action-add-link', 'page-board', 'page-chat', 'page-manual', 'action-profile']

    return SITE_INDEX.filter((entry) => defaults.includes(entry.id))
  }

  return SITE_INDEX
    .map((entry) => ({ entry, weight: score(entry, normalized) }))
    .filter((item) => item.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit)
    .map((item) => item.entry)
}

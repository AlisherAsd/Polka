/**
 * Доменные типы приложения «Recall».
 * Все данные живут только на клиенте (localStorage), бэкенда нет.
 */

/** Поддерживаемые источники ссылок. */
export type CardType = 'youtube' | 'tiktok' | 'telegram' | 'article'

/** Сырая ссылка, пришедшая от пользователя (например, из бэкенда или импорта). */
export interface RawLink {
  url: string
}

/** Нормализованная карточка, готовая к отображению и хранению. */
export interface Card {
  id: string
  url: string
  type: CardType
  title: string
  description?: string
  thumbnailUrl?: string
  authorName?: string
  /** Теги карточки. Сессионные: в localStorage не сохраняются. */
  tags?: readonly string[]
  /** Папка (коллекция), куда отнесена карточка. Сессионно. */
  folder?: string
  /** id папки в дереве базы знаний. Сессионно. */
  folderId?: string
  /** ISO-строка момента создания карточки. */
  createdAt: string
}

/**
 * Частичный результат парсера: всё, что ему удалось достать из источника.
 * `parseLink` достраивает из него полноценную `Card`.
 */
export interface ParsedLink {
  type: CardType
  title: string
  description?: string
  thumbnailUrl?: string
  authorName?: string
}

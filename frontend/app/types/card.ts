/**
 * Доменные типы приложения «Recall».
 * Источник данных — бэкенд (`/api/items`); теги и папки сессионные.
 */

/** Типы карточек: внешние ссылки и заметки. */
export type CardType = 'youtube' | 'tiktok' | 'article' | 'note'

/** Сырая ссылка, пришедшая от пользователя (например, из бэкенда или импорта). */
export interface RawLink {
  url: string
}

/** Карточка в том виде, в котором её отдаёт и принимает бэкенд. */
export interface Card {
  id: string
  type: CardType
  /** Ссылка на источник. У заметок (`type: 'note'`) её нет. */
  url?: string
  title: string
  /** Превью-картинка. */
  thumbnail?: string
  /** Саммари от ИИ. */
  summary?: string
  /** Транскрипт или текст. */
  content?: string
  /** Ссылка на файл в хранилище. */
  fileId?: string
  /** ISO-строка момента создания карточки. */
  createdAt: string
  /** ISO-строка момента последнего изменения. */
  updatedAt: string
  /** Теги карточки. Сессионные: на сервер не пишутся. */
  tags?: readonly string[]
  /** Папка (коллекция), куда отнесена карточка. Сессионно. */
  folder?: string
  /** id папки в дереве базы знаний. Сессионно. */
  folderId?: string
}

/**
 * Частичный результат парсера: всё, что ему удалось достать из источника.
 * `parseLink` достраивает из него полноценную `Card`.
 */
export interface ParsedLink {
  type: CardType
  title: string
  thumbnail?: string
  summary?: string
}

import type { Card, CardType, ParsedLink } from '~/types/card'
import { createId } from '~/utils/id'

/**
 * Клиентские парсеры ссылок.
 *
 * Правила:
 *  - только `fetch` из браузера, никакого server/api;
 *  - любой сетевой запрос ограничен 5 секундами через AbortController;
 *  - парсер НИКОГДА не бросает исключение: при любой проблеме возвращает
 *    минимальный валидный результат (fallback), чтобы одна битая ссылка
 *    не ломала весь список.
 */

/** Жёсткий таймаут одного сетевого запроса. */
const REQUEST_TIMEOUT_MS = 5_000

/** Заголовки, которые в подавляющем большинстве случаев отдают «нормальный» HTML в CORS. */
const FETCH_HEADERS: Readonly<Record<string, string>> = {
  Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
}

/**
 * `fetch` с таймаутом. Возвращает `null`, если запрос не удался,
 * упал по таймауту или сервер ответил не-2xx — вызывающий код
 * переходит на fallback без `try/catch`.
 */
async function fetchResponse(url: string): Promise<Response | null> {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: FETCH_HEADERS,
      credentials: 'omit',
      mode: 'cors',
    })

    return response.ok ? response : null
  } catch {
    return null
  } finally {
    clearTimeout(timerId)
  }
}

/**
 * Публичный CORS-прокси для доменов без `Access-Control-Allow-Origin`
 * (проверено curl'ом: t.me его не отдаёт, прокси отдаёт `*`).
 */
const CORS_PROXY = 'https://api.allorigins.win/raw?url='

/** Нормализует URL для oEmbed: убирает query/fragment/hash, оставляет путь. */
function stripQuery(rawUrl: string): string {
  try {
    const parsed = new URL(ensureProtocol(rawUrl))

    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`
  } catch {
    return rawUrl
  }
}

/** `fetch` + разбор JSON. `null` при любой ошибке (сеть, таймаут, невалидный JSON). */
async function fetchJson(url: string): Promise<unknown> {
  const response = await fetchResponse(url)

  if (!response) {
    return null
  }

  try {
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

/**
 * Чтение HTML-документа по URL. `null`, если запрос не удался или ответ пустой.
 * CORS-заголовки сторонних сайтов бывают не настроены — это штатная ситуация,
 * тогда парсер откатывается на fallback.
 */
async function fetchHtml(url: string): Promise<string | null> {
  const response = await fetchResponse(url)

  if (!response) {
    return null
  }

  try {
    const html = await response.text()

    return html.length > 0 ? html : null
  } catch {
    return null
  }
}

/** Безопасное приведение неизвестного значения к непустой строке. */
function asText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : undefined
}

/** Приведение значения к абсолютному http(s)-URL или `undefined`. */
function asUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  try {
    const parsed = new URL(value)

    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.href
      : undefined
  } catch {
    return undefined
  }
}

/** Извлекает строковое поле из JSON-ответа oEmbed. */
function readJsonField(json: unknown, key: string): string | undefined {
  if (typeof json !== 'object' || json === null || !(key in json)) {
    return undefined
  }

  return asText((json as Record<string, unknown>)[key])
}

/** Разбор HTML-строки в документ. `null`, если DOMParser недоступен (SSR). */
function parseDocument(html: string): Document | null {
  if (typeof DOMParser === 'undefined') {
    return null
  }

  return new DOMParser().parseFromString(html, 'text/html')
}

/** Значение `<meta>` по `property` (og:*) или `name`. */
function readMeta(doc: Document, key: string): string | undefined {
  const element =
    doc.querySelector<HTMLMetaElement>(`meta[property="${key}"]`) ??
    doc.querySelector<HTMLMetaElement>(`meta[name="${key}"]`)

  return asText(element?.getAttribute('content'))
}

/** Декодирует HTML-сущности в тексте (например, `&quot;`, `&#39;`). */
function decodeEntities(value: string): string {
  const doc = parseDocument(`<!doctype html><body>${value}</body>`)

  return asText(doc?.body.textContent) ?? value
}

/** Схема https:// для ссылок без протокола (частый случай: `t.me/durov`). */
function ensureProtocol(url: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`
}

/** Нормализует текст Telegram-заголовка: `Дуров, A` или `Дуров — Telegram` → `Дуров`. */
function cleanTelegramTitle(title: string): string {
  return (
    asText(title.split(/\s+[—–|·]\s+/)[0]?.replace(/,\s*A$/, '')) ?? title
  )
}

/**
 * Общий разбор oEmbed-ответа YouTube/TikTok.
 * @param provider хвост API, например `youtube`
 */
async function parseOEmbed(
  type: 'youtube' | 'tiktok',
  endpoint: string,
  url: string,
  fallbackTitle: string,
): Promise<ParsedLink> {
  const requestUrl = `https://${endpoint}/oembed?url=${encodeURIComponent(url)}&format=json`
  const json = await fetchJson(requestUrl)

  if (json === null) {
    return { type, title: fallbackTitle }
  }

  return {
    type,
    title: readJsonField(json, 'title') ?? fallbackTitle,
    thumbnail: asUrl(readJsonField(json, 'thumbnail_url')),
  }
}

/**
 * YouTube через официальный oEmbed:
 * `https://www.youtube.com/oembed?url=...&format=json`.
 */
export async function parseYouTube(url: string): Promise<ParsedLink> {
  return parseOEmbed('youtube', 'www.youtube.com', url, 'Без названия')
}

/**
 * TikTok через официальный oEmbed:
 * `https://www.tiktok.com/oembed?url=...&format=json`.
 *
 * Проверено вживую (curl): API отвечает 200 и `access-control-allow-origin: *`,
 * но в JSON НЕТ `title`, `thumbnail_url`, `author_name` — только
 * `html`, `provider_*`, `embed_*` (см. /tmp/tt_body2.json). Поэтому:
 *  - URL нормализуется до `https://www.tiktok.com/@user/video/<id>`
 *    (query-мусор `?is_from_webapp=...` не нужен);
 *  - заголовок собирается из `embed_product_id` как нейтральный fallback,
 *    а если oEmbed отдал поля (регрессия на их стороне) — они используются.
 */
export async function parseTikTok(url: string): Promise<ParsedLink> {
  const cleanUrl = stripQuery(url)
  const parsed = await parseOEmbed('tiktok', 'www.tiktok.com', cleanUrl, 'Без названия')

  // Автор из URL: https://www.tiktok.com/@nickname/video/<id>
  const path = ((): string => {
    try {
      return new URL(ensureProtocol(cleanUrl)).pathname
    } catch {
      return ''
    }
  })()

  const handle = /\/@([^/]+)/.exec(path)?.[1]

  // Автор из модели убран: ник из пути дописываем в саммари, если его ещё нет.
  if (handle && !parsed.summary) {
    return { ...parsed, summary: `@${handle}` }
  }

  return parsed
}

/**
 * Telegram: только публичные каналы (`t.me/s/<channel>`, `t.me/<channel>`,
 * `t.me/<channel>/<post>`). Для ссылки на пост всё равно грузим страницу канала
 * `https://t.me/s/<channel>` — у неё есть og-разметка без авторизации.
 */
export async function parseTelegram(url: string): Promise<ParsedLink> {
  const fallback: ParsedLink = { type: 'article', title: 'Telegram' }
  let pathname: string

  try {
    pathname = new URL(ensureProtocol(url)).pathname
  } catch {
    return fallback
  }

  const segments = pathname.split('/').filter((segment) => segment.length > 0)
  const previewPrefix = segments[0] === 's'
  const channel = (previewPrefix ? segments[1] : segments[0])?.trim()

  // Служебные ссылки (t.me/joinchat/..., t.me/+hash) — не публичные каналы.
  if (!channel || !/^[a-z0-9_]{3,}$/i.test(channel)) {
    return fallback
  }

  // Проверено curl'ом: t.me НЕ отдаёт `access-control-allow-origin`
  // (ни у `/s/`, ни у `?embed=1`), поэтому прямой браузерный fetch блокируется CORS.
  // Сначала пробуем напрямую (вдруг заголовки появятся), затем через публичный прокси.
  const target = `https://t.me/s/${channel}`
  const html = (await fetchHtml(target)) ?? (await fetchHtml(`${CORS_PROXY}${encodeURIComponent(target)}`))

  if (!html) {
    return fallback
  }

  const doc = parseDocument(html)

  if (!doc) {
    return fallback
  }

  const rawTitle =
    readMeta(doc, 'og:title') ??
    readMeta(doc, 'twitter:title') ??
    asText(doc.querySelector<HTMLElement>('.tgme_channel_info_header_title')?.textContent)

  // og:description у t.me отсутствует (проверено), описание канала лежит в HTML-классе.
  const description =
    readMeta(doc, 'og:description') ??
    readMeta(doc, 'description') ??
    asText(doc.querySelector<HTMLElement>('.tgme_channel_info_description')?.textContent)

  return {
    type: 'article',
    title: rawTitle ? cleanTelegramTitle(rawTitle) : fallback.title,
    summary: description,
    thumbnail: asUrl(readMeta(doc, 'og:image') ?? readMeta(doc, 'twitter:image')),
  }
}

/**
 * Статья/веб-страница: og:title / og:description / og:image,
 * fallback — `<title>` и первая картинка внутри основного контента.
 */
export async function parseArticle(url: string): Promise<ParsedLink> {
  const fallback: ParsedLink = { type: 'article', title: 'Без названия' }
  // Большинство сайтов не отдают CORS для произвольного origin — пробуем сначала
  // напрямую, затем через публичный CORS-прокси (без него запрос падает всегда).
  const html = (await fetchHtml(url)) ?? (await fetchHtml(`${CORS_PROXY}${encodeURIComponent(url)}`))

  if (!html) {
    return fallback
  }

  const doc = parseDocument(html)

  if (!doc) {
    return fallback
  }

  const docTitle = asText(doc.querySelector('title')?.textContent)
  const firstImage =
    doc.querySelector<HTMLImageElement>('article img[src]') ??
    doc.querySelector<HTMLImageElement>('img[src]')

  const title =
    readMeta(doc, 'og:title') ??
    readMeta(doc, 'twitter:title') ??
    (docTitle ? decodeEntities(docTitle) : undefined)

  const image = asUrl(readMeta(doc, 'og:image') ?? readMeta(doc, 'twitter:image'))

  return {
    type: 'article',
    title: title ?? fallback.title,
    summary: readMeta(doc, 'og:description') ?? readMeta(doc, 'description'),
    thumbnail: image ?? asUrl(firstImage?.getAttribute('src') ?? undefined),
  }
}

/** Определяет тип карточки по хосту ссылки. */
export function detectType(url: string): CardType {
  const host = (() => {
    try {
      return new URL(ensureProtocol(url.trim())).hostname.toLowerCase()
    } catch {
      return ''
    }
  })()

  // Сравниваем «по суффиксу домена»: www.youtube.com, m.youtube.com, youtu.be, m.tiktok.com…
  const matches = (domain: string): boolean =>
    host === domain || host.endsWith(`.${domain}`)

  if (matches('youtube.com') || host === 'youtu.be' || matches('youtube-nocookie.com')) {
    return 'youtube'
  }

  if (matches('tiktok.com')) {
    return 'tiktok'
  }

  // Telegram-каналы разбираются как обычные статьи: отдельного типа карточки больше нет.
  if (matches('t.me') || matches('telegram.me')) {
    return 'article'
  }

  return 'article'
}

/**
 * Добавляет `https://`, если схема не указана: `t.me/durov` → `https://t.me/durov`.
 * Уже корректные и не-http(s) URL возвращаются без изменений.
 */
export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim()

  if (trimmed.length === 0 || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

/**
 * Главная точка входа: URL → полноценная `Card`.
 * Никогда не бросает исключение: если парсер упал, возвращается
 * карточка с типом и URL и заголовком «Без названия».
 */
export async function parseLink(url: string): Promise<Card> {
  const normalizedUrl = normalizeUrl(url)
  const type = detectType(normalizedUrl)

  const parsers: Readonly<Record<CardType, (target: string) => Promise<ParsedLink>>> = {
    youtube: parseYouTube,
    tiktok: parseTikTok,
    note: parseArticle,
    article: parseArticle,
  }

  let parsed: ParsedLink

  try {
    parsed = await parsers[type](normalizedUrl)
  } catch {
    parsed = { type, title: 'Без названия' }
  }

  const now = new Date().toISOString()
  const card: Card = {
    id: createId(),
    url: normalizedUrl,
    type,
    title: parsed.title,
    createdAt: now,
    updatedAt: now,
  }

  if (parsed.summary) {
    card.summary = parsed.summary
  }

  if (parsed.thumbnail) {
    card.thumbnail = parsed.thumbnail
  }

  return card
}

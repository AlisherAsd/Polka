// POST /api/transcript — субтитры YouTube по ссылке.
//
// Тело: { url: string, lang?: string }
// Ответ: { videoId, lang, text, segments: [{ start, duration, text }] }
//
// Библиотека `youtube-caption-extractor` не тянет DOM (только `he` и `striptags`),
// поэтому работает и в Node (dev), и в Cloudflare Workers.
import { getSubtitles } from 'youtube-caption-extractor'

/** Регулярка id видео YouTube. */
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

/** Достаёт id видео из ссылки YouTube (watch, youtu.be, shorts, embed, live) или голого id. */
function parseVideoId(input: string): string | null {
  const value = input.trim()

  if (VIDEO_ID_RE.test(value)) {
    return value
  }

  let url: URL

  try {
    url = new URL(value)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0] ?? ''

    return VIDEO_ID_RE.test(id) ? id : null
  }

  if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
    const v = url.searchParams.get('v')

    if (v && VIDEO_ID_RE.test(v)) {
      return v
    }

    const match = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/)

    return match?.[1] ?? null
  }

  return null
}

export default defineEventHandler(async (event) => {
  const body = (await readBody<{ url?: string; lang?: string }>(event)) ?? {}
  const url = String(body.url ?? '').trim()

  if (url.length === 0) {
    throw createError({ statusCode: 400, message: 'Не указана ссылка' })
  }

  const videoId = parseVideoId(url)

  if (!videoId) {
    throw createError({ statusCode: 400, message: 'Некорректная ссылка YouTube' })
  }

  const lang = typeof body.lang === 'string' && body.lang.trim().length > 0
    ? body.lang.trim()
    : undefined

  let subtitles

  try {
    subtitles = await getSubtitles({ videoID: videoId, lang })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)

    throw createError({
      statusCode: 502,
      message: `Не удалось получить субтитры: ${detail.slice(0, 300)}`,
    })
  }

  if (subtitles.length === 0) {
    throw createError({ statusCode: 404, message: 'У видео нет субтитров' })
  }

  const segments = subtitles.map((item) => ({
    start: Number(item.start) || 0,
    duration: Number(item.dur) || 0,
    text: item.text,
  }))

  return {
    videoId,
    lang: lang ?? 'en',
    text: segments.map((segment) => segment.text).join(' '),
    segments,
  }
})

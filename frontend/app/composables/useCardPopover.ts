/**
 * Поповер «Суммировать»: одновременно открыт максимум у одной карточки.
 * Сетка при этом не меняется — поповер рисуется поверх неё.
 *
 * Здесь же живёт состояние запроса: статус и результат по id карточки,
 * чтобы панель могла сразу показать загрузку и текст ответа.
 */
export type SummaryStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface SummaryState {
  status: SummaryStatus
  /** Текст саммари (или текст ошибки — при `error`). */
  text: string
}

/** Ответ `POST /api/transcript`: субтитры видео плюс собранный текст. */
interface TranscriptResponse {
  videoId: string
  lang: string
  text: string
  segments: { start: number; duration: number; text: string }[]
}

export function useCardPopover() {
  const openId = useState<string | null>('card-summary-popover', () => null)
  const summaries = useState<Record<string, SummaryState>>('card-summaries', () => ({}))
  /** Защита от повторных запросов по одной карточке. */
  const inFlight = new Set<string>()

  function isOpen(id: string): boolean {
    return openId.value === id
  }

  function toggle(id: string): void {
    openId.value = openId.value === id ? null : id
  }

  function close(): void {
    openId.value = null
  }

  function summaryOf(id: string): SummaryState {
    return summaries.value[id] ?? { status: 'idle', text: '' }
  }

  function setSummary(id: string, state: SummaryState): void {
    summaries.value = { ...summaries.value, [id]: state }
  }

  /** Текст для отправки в модель: сначала транскрипт/текст, иначе описание. */
  function sourceTextOf(card: { content?: string; summary?: string; title: string }): string {
    return card.content?.trim() || card.summary?.trim() || card.title
  }

  /**
   * Открывает панель, при необходимости тянет субтитры YouTube и отправляет
   * их в `/api/summarize`. Повторный вызов для готовой карточки ничего не делает.
   */
  async function openWithSummary(card: { id: string; type: string; url?: string; title: string; content?: string; summary?: string }): Promise<void> {
    openId.value = card.id

    const current = summaryOf(card.id)

    if (current.status === 'ready' || current.status === 'loading' || inFlight.has(card.id)) {
      return
    }

    inFlight.add(card.id)
    setSummary(card.id, { status: 'loading', text: '' })

    try {
      // Для YouTube сначала получаем субтитры отдельной ручкой, чтобы модель
      // суммировала именно текст видео, а не только заголовок.
      let source = sourceTextOf(card)

      if (card.type === 'youtube' && card.url) {
        try {
          const transcript = await $fetch<TranscriptResponse>('/api/transcript', {
            method: 'POST',
            body: { url: card.url },
          })

          if (transcript?.text) {
            source = transcript.text
          }
        } catch {
          // Нет субтитров — суммируем по доступному описанию.
        }
      }

      const res = await $fetch<{ text: string }>('/api/summarize', {
        method: 'POST',
        body: {
          cards: [
            {
              title: card.title,
              description: source.slice(0, 8000),
              url: card.url,
            },
          ],
        },
      })

      setSummary(card.id, { status: 'ready', text: res?.text?.trim() || 'Модель вернула пустой ответ' })
    } catch (error) {
      const message = (error as { data?: { message?: unknown } })?.data?.message

      setSummary(card.id, {
        status: 'error',
        text: typeof message === 'string' && message.length > 0
          ? message
          : 'Не удалось получить саммари',
      })
    } finally {
      inFlight.delete(card.id)
    }
  }

  return { openId, isOpen, toggle, close, summaryOf, openWithSummary }
}

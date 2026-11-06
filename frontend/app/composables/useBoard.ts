import { computed, readonly, ref } from 'vue'
import type { Ref } from 'vue'
import { fetchBoard, saveBoardNode } from '~/api/board'
import type { BoardNode } from '~/api/board'
import type { Note } from '~/api/notes'
import type { Card } from '~/types/card'

/** Размеры блоков доски в логических px. */
export const BOARD_CARD_WIDTH = 200
export const BOARD_FILE_WIDTH = 320
export const BOARD_FILE_HEIGHT = 260

/** Узел доски, готовый к отрисовке. */
export interface PlacedCardNode {
  kind: 'card'
  key: string
  card: Card
  x: number
  y: number
  width: number
  height?: number
}

export interface PlacedFileNode {
  kind: 'file'
  key: string
  note: Note
  /** Карточка, к которой привязан файл (`notes.item_id`), если есть. */
  card?: Card
  x: number
  y: number
  width: number
  height: number
}

export type PlacedNode = PlacedCardNode | PlacedFileNode

interface BoardState {
  nodes: Ref<BoardNode[]>
  loading: Ref<boolean>
  error: Ref<string | null>
}

let sharedState: BoardState | null = null
let loaded = false

function ensureState(): BoardState {
  if (!sharedState) {
    sharedState = {
      nodes: ref<BoardNode[]>([]),
      loading: ref(false),
      error: ref<string | null>(null),
    }
  }

  return sharedState
}

/**
 * Доска: раскладывает карточки и файлы (заметки) по координатам из D1.
 * Связь «карточка ↔ файл» берётся из `notes.item_id`, отдельного графа нет.
 */
export function useBoard() {
  const state = ensureState()
  const { cards } = useCards()
  const { notes } = useFiles()

  const nodes = readonly(state.nodes)
  const loading = readonly(state.loading)
  const error = readonly(state.error)

  /** Позиция узла по ключу (id карточки или заметки). */
  function positionOf(key: string): BoardNode | undefined {
    return state.nodes.value.find((node) => node.itemId === key || node.noteId === key)
  }

  /** Автоматическая раскладка: файл — рядом вместе с его карточкой. */
  function fallbackPosition(kind: 'card' | 'file', index: number): { x: number; y: number } {
    const columns = 4
    const gap = 24

    if (kind === 'card') {
      return {
        x: (index % columns) * (BOARD_CARD_WIDTH + gap) + gap,
        y: Math.floor(index / columns) * (BOARD_FILE_HEIGHT + gap * 2) + gap,
      }
    }

    // Файлы не расходятся в основной сетке: их место вычисляется от карточки.
    return { x: gap, y: gap + index * (BOARD_FILE_HEIGHT + gap) }
  }

  /** Узлы для рендера: карточки + файлы, с координатами. */
  const placed = computed<PlacedNode[]>(() => {
    const byId = new Map(cards.value.map((card) => [card.id, card]))
    const result: PlacedNode[] = []

    cards.value.forEach((card, index) => {
      const saved = positionOf(card.id)
      const fallback = fallbackPosition('card', index)

      result.push({
        kind: 'card',
        key: card.id,
        card,
        x: saved?.x ?? fallback.x,
        y: saved?.y ?? fallback.y,
        width: saved?.width ?? BOARD_CARD_WIDTH,
        height: saved?.height,
      })
    })

    // Файлы без карточки выстраиваются колонкой слева от сетки.
    let orphanIndex = 0

    notes.value.forEach((note) => {
      const card = note.itemId ? byId.get(note.itemId) : undefined
      const saved = positionOf(note.id)

      // Файл, у которого есть карточка, ставится справа от неё.
      const cardNode = card ? result.find((node) => node.kind === 'card' && node.key === card.id) : undefined
      const fallback = cardNode
        ? { x: cardNode.x + cardNode.width + 24, y: cardNode.y }
        : fallbackPosition('file', orphanIndex++)

      result.push({
        kind: 'file',
        key: note.id,
        note,
        card,
        x: saved?.x ?? fallback.x,
        y: saved?.y ?? fallback.y,
        width: saved?.width ?? BOARD_FILE_WIDTH,
        height: saved?.height ?? BOARD_FILE_HEIGHT,
      })
    })

    return result
  })

  /** Связи «карточка → её файлы» по `notes.item_id`. */
  const links = computed(() =>
    notes.value
      .filter((note) => Boolean(note.itemId))
      .map((note) => ({ itemId: note.itemId as string, noteId: note.id })),
  )

  /** Первичная загрузка позиций (один раз за вкладку). */
  async function init(): Promise<void> {
    if (!import.meta.client || loaded) {
      return
    }

    loaded = true
    state.loading.value = true
    state.error.value = null

    try {
      state.nodes.value = await fetchBoard()
    } catch {
      state.error.value = 'Не удалось загрузить доску'
    } finally {
      state.loading.value = false
    }
  }

  /** Запоминает позицию локально и сохраняет её в D1 (ошибки не показываем). */
  function moveNode(key: string, x: number, y: number): void {
    const existing = positionOf(key)

    state.nodes.value = existing
      ? state.nodes.value.map((node) =>
        node.id === existing.id ? { ...node, x, y } : node,
      )
      : [
        ...state.nodes.value,
        {
          id: key,
          itemId: key,
          x,
          y,
          updatedAt: new Date().toISOString(),
        },
      ]

    const node = state.nodes.value.find((item) => item.id === existing?.id || item.id === key)

    void saveBoardNode(key, {
      x,
      y,
      // Для карточек размер фиксированный, для файлов — сохраняем текущий.
      ...(node?.width !== undefined ? { width: node.width } : {}),
      ...(node?.height !== undefined ? { height: node.height } : {}),
    }).catch(() => undefined)
  }

  return { nodes, placed, links, loading, error, init, moveNode, positionOf }
}

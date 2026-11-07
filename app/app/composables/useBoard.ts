import { computed, readonly, ref } from 'vue'
import type { Ref } from 'vue'
import { fetchBoard, saveBoardNode } from '~/api/board'
import { useApiBase } from '~/api/client'
import type { BoardNode } from '~/api/board'
import type { Note } from '~/api/notes'
import type { Card } from '~/types/card'

/** Размеры блоков доски в логических px. */
export const BOARD_CARD_WIDTH = 200
export const BOARD_FILE_WIDTH = 280
export const BOARD_FILE_HEIGHT = 220

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
  /** Папка, чья доска сейчас загружена. */
  folderId: Ref<string | null>
  nodes: Ref<BoardNode[]>
  loading: Ref<boolean>
  error: Ref<string | null>
}

let sharedState: BoardState | null = null
let loadPromise: Promise<void> | null = null
/** Номер последнего запроса: ответы устаревших запросов не применяем. */
let requestSeq = 0

function ensureState(): BoardState {
  if (!sharedState) {
    sharedState = {
      folderId: ref<string | null>(null),
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
  const apiBase = useApiBase()

  const nodes = readonly(state.nodes)
  const loading = readonly(state.loading)
  const error = readonly(state.error)

  /** Позиция узла по ключу (id карточки или заметки). */
  function positionOf(key: string): BoardNode | undefined {
    return state.nodes.value.find((node) => node.itemId === key || node.noteId === key)
  }

  /** Узлы для рендера: только то, что лежит на этой доске. */
  /**
   * Содержимое доски — только узлы этой доски (`board_nodes`).
   *
   * Раньше на доску попадали все карточки пользователя и все заметки, из-за
   * чего «Мои знания» и любая папка выглядели одинаково. Связь карточек
   * с доской убрана: на доске лежит только то, что пользователь положил сам.
   */
  const placed = computed<PlacedNode[]>(() => {
    const byId = new Map(cards.value.map((card) => [card.id, card]))
    const noteById = new Map(notes.value.map((note) => [note.id, note]))
    const result: PlacedNode[] = []

    for (const node of state.nodes.value) {
      if (node.itemId) {
        const card = byId.get(node.itemId)

        // Карточка ещё не загрузилась — пропускаем до следующего рендера.
        if (!card) {
          continue
        }

        result.push({
          kind: 'card',
          key: card.id,
          card,
          x: node.x,
          y: node.y,
          width: node.width ?? BOARD_CARD_WIDTH,
          height: node.height,
        })

        continue
      }

      if (node.noteId) {
        const note = noteById.get(node.noteId)

        if (!note) {
          continue
        }

        result.push({
          kind: 'file',
          key: note.id,
          note,
          card: note.itemId ? byId.get(note.itemId) : undefined,
          x: node.x,
          y: node.y,
          width: node.width ?? BOARD_FILE_WIDTH,
          height: node.height ?? BOARD_FILE_HEIGHT,
        })
      }
    }

    return result
  })

  /** Связи «карточка → её файлы» по `notes.item_id`. */
  const links = computed(() =>
    notes.value
      .filter((note) => Boolean(note.itemId))
      .map((note) => ({ itemId: note.itemId as string, noteId: note.id })),
  )

  /**
   * Загрузка позиций с сервера. Вызывать можно многократно: одновременно идёт
   * один запрос, повторный вызов после завершения перечитывает доску.
   */
  async function init(folderId: string): Promise<void> {
    if (!import.meta.client) {
      return
    }

    // Без folderId (гость или пустая страница) — доска пустая.
    if (!folderId) {
      requestSeq++
      state.nodes.value = []
      state.folderId.value = null
      state.loading.value = false
      state.error.value = null

      return
    }

    // Эта доска уже грузится — отдаём тот же промис.
    if (loadPromise && state.folderId.value === folderId) {
      return loadPromise
    }

    // Меняем папку — сразу убираем узлы прежней доски. Иначе при медленном
    // или упавшем запросе на экране оставались файлы предыдущей папки.
    const switched = state.folderId.value !== folderId

    if (switched) {
      state.nodes.value = []
    }

    state.folderId.value = folderId
    state.loading.value = true
    state.error.value = null

    const seq = ++requestSeq

    const request = fetchBoard(apiBase, folderId)
      .then((board) => {
        // Пока шёл запрос, открыли другую доску — этот ответ уже неактуален.
        if (seq !== requestSeq) {
          return
        }

        state.nodes.value = board.nodes
      })
      .catch(() => {
        if (seq !== requestSeq) {
          return
        }

        state.nodes.value = []
        state.error.value = 'Не удалось загрузить доску'
      })
      .finally(() => {
        if (seq !== requestSeq) {
          return
        }

        state.loading.value = false
        loadPromise = null
      })

    loadPromise = request

    return request
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

    void saveBoardNode(apiBase, state.folderId.value ?? '', key, {
      x,
      y,
      // Для карточек размер фиксированный, для файлов — сохраняем текущий.
      ...(node?.width !== undefined ? { width: node.width } : {}),
      ...(node?.height !== undefined ? { height: node.height } : {}),
    }).catch(() => undefined)
  }

  return { nodes, placed, links, loading, error, init, moveNode, positionOf }
}

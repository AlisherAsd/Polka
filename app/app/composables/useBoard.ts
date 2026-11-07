import { computed, readonly, ref } from 'vue'
import type { Ref } from 'vue'
import { fetchBoard, saveBoardNode } from '~/api/board'
import { apiFetch, useApiBase } from '~/api/client'
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

/** Данные публичной доски: чужие карточки и заметки, которых нет в сторах. */
interface SharedBoardData {
  title: string
  /** Имя автора (часть email до `@`) для публичной доски. */
  author: string | null
  cards: Card[]
  notes: Note[]
}

/** Ответ `GET /api/public/:slug` — только то, что нужно для отрисовки. */
interface PublicCollection {
  title: string
  author?: string | null
  cards: Card[]
  notes: Note[]
  nodes: {
    itemId?: string
    noteId?: string
    x: number
    y: number
    width?: number
    height?: number
  }[]
}

interface BoardState {
  /** Папка, чья доска сейчас загружена. */
  folderId: Ref<string | null>
  nodes: Ref<BoardNode[]>
  /** Непусто — на экране публичная доска (только чтение по сети). */
  shared: Ref<SharedBoardData | null>
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
      shared: ref<SharedBoardData | null>(null),
      loading: ref(false),
      error: ref<string | null>(null),
    }
  }

  return sharedState
}

/**
 * Доска: раскладывает карточки и файлы (заметки) по координатам из D1.
 * Связь «карточка ↔ файл» берётся из `notes.item_id`, отдельного графа нет.
 *
 * Один и тот же стейт обслуживает и свою доску (`init`), и публичную
 * (`initShared`): компонент доски, зум и перетаскивание общие.
 */
export function useBoard() {
  const state = ensureState()
  const { cards } = useCards()
  const { notes } = useFiles()
  const apiBase = useApiBase()

  const nodes = readonly(state.nodes)
  const loading = readonly(state.loading)
  const error = readonly(state.error)
  const sharedTitle = computed<string | null>(() => state.shared.value?.title ?? null)
  const sharedAuthor = computed<string | null>(() => state.shared.value?.author ?? null)
  const isShared = computed<boolean>(() => state.shared.value !== null)

  /** Позиция узла по ключу (id карточки или заметки). */
  function positionOf(key: string): BoardNode | undefined {
    return state.nodes.value.find((node) => node.itemId === key || node.noteId === key)
  }

  /**
   * Содержимое доски — только узлы этой доски (`board_nodes`).
   *
   * Раньше на доску попадали все карточки пользователя и все заметки, из-за
   * чего «Мои знания» и любая папка выглядели одинаково. Связь карточек
   * с доской убрана: на доске лежит только то, что пользователь положил сам.
   */
  const placed = computed<PlacedNode[]>(() => {
    // Публичная доска приносит свои карточки/заметки: в сторах зрителя их нет.
    const cardList = state.shared.value?.cards ?? cards.value
    const noteList = state.shared.value?.notes ?? notes.value
    const byId = new Map(cardList.map((card) => [card.id, card]))
    const noteById = new Map(noteList.map((note) => [note.id, note]))
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
  const links = computed(() => {
    const noteList = state.shared.value?.notes ?? notes.value

    return noteList
      .filter((note) => Boolean(note.itemId))
      .map((note) => ({ itemId: note.itemId as string, noteId: note.id }))
  })

  /**
   * Загрузка позиций с сервера. Вызывать можно многократно: одновременно идёт
   * один запрос, повторный вызов после завершения перечитывает доску.
   */
  async function init(folderId: string): Promise<void> {
    if (!import.meta.client) {
      return
    }

    // Своя доска: публичные данные больше не нужны.
    state.shared.value = null

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

  /** Публичная доска: те же узлы, но из `/api/public/:slug` (без входа). */
  async function initShared(slug: string): Promise<void> {
    if (!import.meta.client || !slug) {
      return
    }

    const seq = ++requestSeq

    state.folderId.value = null
    state.nodes.value = []
    state.shared.value = null
    state.loading.value = true
    state.error.value = null

    try {
      const res = await apiFetch<{ collection: PublicCollection }>(
        apiBase,
        `/api/public/${encodeURIComponent(slug)}`,
      )

      if (seq !== requestSeq) {
        return
      }

      const collection = res.collection

      state.shared.value = {
        title: collection.title,
        author: typeof collection.author === 'string' ? collection.author : null,
        cards: Array.isArray(collection.cards) ? collection.cards : [],
        notes: Array.isArray(collection.notes) ? collection.notes : [],
      }
      state.nodes.value = (collection.nodes ?? []).map((node, index) => {
        const mapped: BoardNode = {
          id: node.itemId ?? node.noteId ?? `shared-${index}`,
          x: node.x,
          y: node.y,
          updatedAt: '',
        }

        if (node.itemId) {
          mapped.itemId = node.itemId
        }

        if (node.noteId) {
          mapped.noteId = node.noteId
        }

        if (typeof node.width === 'number') {
          mapped.width = node.width
        }

        if (typeof node.height === 'number') {
          mapped.height = node.height
        }

        return mapped
      })
    } catch {
      if (seq !== requestSeq) {
        return
      }

      state.nodes.value = []
      state.error.value = 'Не удалось загрузить доску'
    } finally {
      if (seq === requestSeq) {
        state.loading.value = false
      }
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

    // Публичная доска — только просмотр: двигаем локально, никуда не пишем.
    if (state.shared.value) {
      return
    }

    const node = state.nodes.value.find((item) => item.id === existing?.id || item.id === key)

    void saveBoardNode(apiBase, state.folderId.value ?? '', key, {
      x,
      y,
      // Для карточек размер фиксированный, для файлов — сохраняем текущий.
      ...(node?.width !== undefined ? { width: node.width } : {}),
      ...(node?.height !== undefined ? { height: node.height } : {}),
    }).catch(() => undefined)
  }

  return {
    nodes,
    placed,
    links,
    loading,
    error,
    sharedTitle,
    sharedAuthor,
    isShared,
    init,
    initShared,
    moveNode,
    positionOf,
  }
}

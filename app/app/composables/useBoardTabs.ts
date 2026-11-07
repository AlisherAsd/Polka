/**
 * Открытые доски как табы на странице «Доска».
 *
 * Клик по папке открывает её доску в новой вкладке (внутри страницы), а не
 * отдельным маршрутом на каждую папку. Набор открытых вкладок и активная
 * сохраняются в localStorage, поэтому после перезагрузки всё остаётся.
 */
export interface BoardTab {
  /** id папки — он же идентификатор вкладки и её адреса (`/board?folder=`). */
  folderId: string
  name: string
}

const STORAGE_KEY = 'polka-board-tabs'

export function useBoardTabs() {
  const tabs = useState<BoardTab[]>('board-tabs', () => [])
  const activeId = useState<string | null>('board-tabs-active', () => null)
  const loaded = useState<boolean>('board-tabs-loaded', () => false)

  /** Читает вкладки из localStorage один раз. */
  function restore(): void {
    if (loaded.value || !import.meta.client) {
      return
    }

    loaded.value = true

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as { tabs?: BoardTab[]; activeId?: string | null }) : null

      if (Array.isArray(parsed?.tabs)) {
        tabs.value = parsed.tabs.filter(
          (tab) => typeof tab?.folderId === 'string' && typeof tab?.name === 'string',
        )
        activeId.value = typeof parsed?.activeId === 'string' ? parsed.activeId : tabs.value[0]?.folderId ?? null
      }
    } catch {
      // Испорченное хранилище — просто начинаем с пустого набора.
    }
  }

  function persist(): void {
    if (!import.meta.client) {
      return
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tabs: tabs.value, activeId: activeId.value }),
      )
    } catch {
      // Приватный режим: вкладки проживут до перезагрузки.
    }
  }

  /** Открывает доску папки (или переключается на уже открытую). */
  function open(folderId: string, name?: string): void {
    restore()

    const existing = tabs.value.find((tab) => tab.folderId === folderId)

    if (existing) {
      if (name && existing.name !== name) {
        existing.name = name
        persist()
      }
    } else {
      tabs.value = [...tabs.value, { folderId, name: name ?? 'Доска' }]
      persist()
    }

    activeId.value = folderId
    persist()
  }

  /** Переключает активную вкладку. */
  function activate(folderId: string): void {
    activeId.value = folderId
    persist()
  }

  /** Закрывает вкладку; если закрыли активную — активируется соседняя. */
  function close(folderId: string): void {
    const index = tabs.value.findIndex((tab) => tab.folderId === folderId)

    if (index === -1) {
      return
    }

    const wasActive = activeId.value === folderId

    tabs.value = tabs.value.filter((tab) => tab.folderId !== folderId)

    if (wasActive) {
      activeId.value = tabs.value[index]?.folderId ?? tabs.value[index - 1]?.folderId ?? null
    }

    persist()
  }

  /** Обновляет название вкладки (после переименования папки или загрузки списка). */
  function rename(folderId: string, name: string): void {
    const tab = tabs.value.find((item) => item.folderId === folderId)

    if (tab && tab.name !== name) {
      tab.name = name
      persist()
    }
  }

  /** Убирает из вкладок папки, которых больше нет. */
  function prune(existingIds: readonly string[]): void {
    const allowed = new Set(existingIds)
    const next = tabs.value.filter((tab) => allowed.has(tab.folderId))

    if (next.length !== tabs.value.length) {
      tabs.value = next

      if (activeId.value && !allowed.has(activeId.value)) {
        activeId.value = next[0]?.folderId ?? null
      }

      persist()
    }
  }

  const activeTab = computed<BoardTab | null>(
    () => tabs.value.find((tab) => tab.folderId === activeId.value) ?? null,
  )

  return { tabs, activeId, activeTab, restore, open, activate, close, rename, prune }
}

/**
 * Состояние второй (рабочей) панели между рейкой навигации и контентом:
 * открыта/закрыта и ширина (её можно тянуть за разделитель).
 */
const MIN_WIDTH = 180
const MAX_WIDTH = 520
const DEFAULT_WIDTH = 224
const STORAGE_KEY = 'polka-side-panel-width'

export function useSidePanel() {
  /** Панель по умолчанию закрыта — открывается стрелкой в хедере. */
  const open = useState<boolean>('side-panel-open', () => false)
  const width = useState<number>('side-panel-width', () => DEFAULT_WIDTH)

  function clamp(value: number): number {
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)))
  }

  /** Ширина из localStorage (вызывается при старте приложения). */
  function restoreWidth(): void {
    if (!import.meta.client) {
      return
    }

    try {
      const stored = Number(window.localStorage.getItem(STORAGE_KEY))

      if (Number.isFinite(stored) && stored > 0) {
        width.value = clamp(stored)
      }
    } catch {
      // Приватный режим — остаёмся на ширине по умолчанию.
    }
  }

  /** Запоминает ширину, чтобы панель оставалась такой же после перезагрузки. */
  function setWidth(value: number): void {
    width.value = clamp(value)

    if (!import.meta.client) {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, String(width.value))
    } catch {
      // Не критично: ширина просто не сохранится.
    }
  }

  function toggleSidePanel(): void {
    open.value = !open.value
  }

  function openSidePanel(): void {
    open.value = true
  }

  function closeSidePanel(): void {
    open.value = false
  }

  return {
    open,
    width,
    MIN_WIDTH,
    MAX_WIDTH,
    restoreWidth,
    setWidth,
    toggleSidePanel,
    openSidePanel,
    closeSidePanel,
  }
}

/** Состояние второй (рабочей) панели между рейкой навигации и контентом. */
export function useSidePanel() {
  /** Панель по умолчанию закрыта — открывается стрелкой в хедере. */
  const open = useState<boolean>('side-panel-open', () => false)

  function toggleSidePanel(): void {
    open.value = !open.value
  }

  function openSidePanel(): void {
    open.value = true
  }

  function closeSidePanel(): void {
    open.value = false
  }

  return { open, toggleSidePanel, openSidePanel, closeSidePanel }
}

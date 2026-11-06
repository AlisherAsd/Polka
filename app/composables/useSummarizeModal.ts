/** Состояние модалки «Суммировать ИИ» для выбранных карточек. */
export function useSummarizeModal() {
  const open = useState<boolean>('summarize-modal-open', () => false)

  function openModal(): void {
    open.value = true
  }

  function closeModal(): void {
    open.value = false
  }

  return { open, openModal, closeModal }
}

/** Состояние модалки «В папку»: открывается из панели выделения. */
export function useFolderModal() {
  const open = useState<boolean>('folder-modal-open', () => false)

  function openModal(): void {
    open.value = true
  }

  function closeModal(): void {
    open.value = false
  }

  return { open, openModal, closeModal }
}

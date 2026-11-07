/** Состояние модалки «Новая заметка»: открывается из панели «Файлы». */
export function useNoteModal() {
  const open = useState<boolean>('note-modal-open', () => false)

  function openModal(): void {
    open.value = true
  }

  function closeModal(): void {
    open.value = false
  }

  return { open, openModal, closeModal }
}

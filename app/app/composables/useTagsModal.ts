/** Состояние модалки «Теги»: открывается из боковой панели. */
export function useTagsModal() {
  const open = useState<boolean>('tags-modal-open', () => false)

  function openModal(): void {
    open.value = true
  }

  function closeModal(): void {
    open.value = false
  }

  return { open, openModal, closeModal }
}

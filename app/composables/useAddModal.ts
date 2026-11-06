/** Состояние модалки «Добавить ссылку»: открывается из сайдбара и хедера. */
export function useAddModal() {
  const open = useState<boolean>('add-modal-open', () => false)

  function openModal(): void {
    open.value = true
  }

  function closeModal(): void {
    open.value = false
  }

  return { open, openModal, closeModal }
}

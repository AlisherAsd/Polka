/** Состояние модалки «Премиум»: описание и кнопки «Купить» / «Отмена». */
export function usePremiumModal() {
  const open = useState<boolean>('premium-modal-open', () => false)

  function openModal(): void {
    open.value = true
  }

  function closeModal(): void {
    open.value = false
  }

  return { open, openModal, closeModal }
}

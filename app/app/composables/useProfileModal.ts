/** Состояние модалки профиля: открывается по кнопке профиля в сайдбаре. */
export function useProfileModal() {
  const open = useState<boolean>('profile-modal-open', () => false)

  function openModal(): void {
    open.value = true
  }

  function closeModal(): void {
    open.value = false
  }

  return { open, openModal, closeModal }
}

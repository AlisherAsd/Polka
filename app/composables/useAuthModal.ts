/** Состояние модалки авторизации: открывается из профиля в сайдбаре. */
export function useAuthModal() {
  const open = useState<boolean>('auth-modal-open', () => false)

  function openModal(): void {
    open.value = true
  }

  function closeModal(): void {
    open.value = false
  }

  return { open, openModal, closeModal }
}

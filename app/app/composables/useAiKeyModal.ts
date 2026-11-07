/** Состояние модалки «Ключ OpenRouter»: ввести или заменить свой ключ. */
export function useAiKeyModal() {
  const open = useState<boolean>('ai-key-modal-open', () => false)

  function openModal(): void {
    open.value = true
  }

  function closeModal(): void {
    open.value = false
  }

  return { open, openModal, closeModal }
}

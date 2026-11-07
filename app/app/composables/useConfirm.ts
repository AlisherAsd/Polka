/**
 * Подтверждение действия своей модалкой вместо `window.confirm`.
 *
 * В Tauri 2 `window.confirm`/`alert` не поддерживаются: WebView не показывает
 * диалог и возвращает `undefined`, поэтому удаление в приложении молча
 * отменялось. Здесь — состояние модалки и промис с ответом пользователя.
 */
interface ConfirmState {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  /** Тональность кнопки подтверждения: удаление — `danger`. */
  danger: boolean
}

export function useConfirm() {
  const state = useState<ConfirmState>('confirm-state', () => ({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Подтвердить',
    danger: false,
  }))

  const pending = useState<{ resolve: ((value: boolean) => void) | null }>(
    'confirm-pending',
    () => ({ resolve: null }),
  )

  /** Спрашивает подтверждение; промис резолвится `true` (да) или `false` (нет). */
  function ask(options: {
    title: string
    description?: string
    confirmLabel?: string
    danger?: boolean
  }): Promise<boolean> {
    // Если предыдущий вопрос не закрыт — считаем его отменённым.
    pending.value.resolve?.(false)

    state.value = {
      open: true,
      title: options.title,
      description: options.description ?? '',
      confirmLabel: options.confirmLabel ?? 'Подтвердить',
      danger: options.danger ?? false,
    }

    return new Promise<boolean>((resolve) => {
      pending.value = { resolve }
    })
  }

  function answer(value: boolean): void {
    pending.value.resolve?.(value)
    pending.value = { resolve: null }
    state.value = { ...state.value, open: false }
  }

  return { state, ask, answer }
}

/**
 * Уведомления (Nuxt UI `useToast`) для действий с данными: карточки, папки,
 * заметки. Одна точка входа, чтобы тексты и стили не расходились по компонентам.
 *
 * Стабильные `id` на тип события: повторные тосты не множатся, а заменяют друг друга.
 */
export function useNotify() {
  const toast = useToast()

  /** Успешное действие. */
  function success(message: string, title = 'Готово'): void {
    toast.add({
      id: `ok-${message}`,
      title,
      description: message,
      color: 'success',
      icon: 'i-lucide-check-circle',
      duration: 3000,
    })
  }

  /** Ошибка: `message` — текст из `{ message }` ответа API или запасной вариант. */
  function error(message: string, title = 'Ошибка'): void {
    toast.add({
      id: `err-${message}`,
      title,
      description: message,
      color: 'error',
      icon: 'i-lucide-circle-alert',
      duration: 6000,
    })
  }

  /**
   * Достаёт текст ошибки из `$fetch`-исключения (`data.message` от Nitro).
   * Возвращает `fallback`, если сообщения нет.
   */
  function messageOf(err: unknown, fallback: string): string {
    const message = (err as { data?: { message?: unknown } })?.data?.message

    return typeof message === 'string' && message.length > 0 ? message : fallback
  }

  /** Ошибка из исключения: текст берётся из ответа API. */
  function fail(err: unknown, fallback: string): void {
    error(messageOf(err, fallback))
  }

  return { success, error, messageOf, fail }
}

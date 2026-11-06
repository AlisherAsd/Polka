/** Состояние чата с ИИ: история на текущую сессию (в памяти). */
export interface ChatEntry {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/** Общая история чата — переживает переходы между страницами. */
export function useAiChat() {
  const history = useState<ChatEntry[]>('ai-chat-history', () => [])
  const pending = useState<boolean>('ai-chat-pending', () => false)
  const failure = useState<string>('ai-chat-failure', () => '')

  async function send(text: string): Promise<void> {
    const prompt = text.trim()

    if (prompt.length === 0 || pending.value) {
      return
    }

    failure.value = ''
    history.value.push({ id: crypto.randomUUID(), role: 'user', content: prompt })
    pending.value = true

    try {
      const res = await $fetch<{ text: string }>('/api/ask', {
        method: 'POST',
        body: { prompt },
      })

      history.value.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.text,
      })
    } catch (error) {
      failure.value =
        error instanceof Error ? error.message : 'Не удалось получить ответ'
    } finally {
      pending.value = false
    }
  }

  function clear(): void {
    history.value = []
    failure.value = ''
  }

  return { history, pending, failure, send, clear }
}

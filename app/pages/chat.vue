<script setup lang="ts">
/** Минимальная страница чата с ИИ. История — текущая сессия. */
const { history, pending, failure, send, clear } = useAiChat()

const prompt = ref<string>('')

function submit(): void {
  void send(prompt.value)
  prompt.value = ''
}
</script>

<template>
  <section class="mx-auto flex h-[calc(100dvh-56px)] w-full max-w-3xl flex-col px-4 py-4 sm:px-6">
    <header class="mb-3 flex items-center justify-between gap-2">
      <h1 class="text-lg font-semibold text-ink">Чат</h1>
      <UButton
        v-if="history.length > 0"
        type="button"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-eraser"
        label="Очистить"
        @click="clear"
      />
    </header>

    <div class="min-h-0 flex-1 space-y-2 overflow-y-auto">
      <p v-if="history.length === 0" class="text-sm text-mute">
        Задайте вопрос — ответ появится здесь.
      </p>

      <div
        v-for="entry in history"
        :key="entry.id"
        class="max-w-[85%] rounded-xl px-3 py-2 text-sm"
        :class="
          entry.role === 'user'
            ? 'ml-auto bg-primary/10 text-ink'
            : 'border border-line bg-surface text-dim'
        "
      >
        <p class="whitespace-pre-wrap break-words">{{ entry.content }}</p>
      </div>

      <p v-if="pending" class="text-xs text-mute">Печатает…</p>
    </div>

    <div class="mt-3 flex flex-col gap-1">
      <p v-if="failure" class="text-xs text-error">{{ failure }}</p>

      <UInput
        v-model="prompt"
        size="md"
        placeholder="Сообщение"
        :disabled="pending"
        class="w-full"
        @keydown.enter.prevent="submit"
      />
    </div>
  </section>
</template>

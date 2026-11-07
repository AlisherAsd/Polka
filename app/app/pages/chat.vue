<script setup lang="ts">
/** Страница чата: нужен вход и доступ к ИИ (свой ключ или премиум). */
const { history, pending, failure, send, clear } = useAiChat()
const { isAuth } = useAuth()
const { canUseAi } = useAiKey()

const prompt = ref<string>('')

function submit(): void {
  void send(prompt.value)
  prompt.value = ''
}
</script>

<template>
  <section class="mx-auto flex h-[calc(100dvh-56px)] w-full max-w-3xl flex-col px-4 py-4 sm:px-6">
    <!-- Гость: функции чата закрыты -->
    <AuthGate
      v-if="!isAuth"
      feature="Чат"
      description="AI-чат доступен после входа в аккаунт."
    />

    <!-- Вошёл, но нет доступа к ИИ: свой ключ или премиум -->
    <div v-else-if="!canUseAi" class="m-auto flex max-w-md flex-col items-center gap-3 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-mute" />
      <p class="text-sm text-dim">
        Для чата нужен доступ к ИИ: укажите свой ключ OpenRouter или оформите премиум.
      </p>
      <AiFeaturePopover feature="AI чат">
        <UButton type="button" color="neutral" variant="outline" size="md" icon="i-lucide-key-round"
          label="Настроить доступ" class="rounded-xl px-6" />
      </AiFeaturePopover>
    </div>

    <template v-else>
      <header class="mb-3 flex items-center justify-between gap-2">
        <h1 class="text-lg font-semibold text-ink">Чат</h1>
        <UButton v-if="history.length > 0" type="button" color="neutral" variant="ghost" size="sm"
          icon="i-lucide-eraser" label="Очистить" @click="clear" />
      </header>

      <div class="min-h-0 flex-1 space-y-2 overflow-y-auto">
        <p v-if="history.length === 0" class="text-sm text-mute">
          Задайте вопрос — ответ появится здесь.
        </p>

        <div v-for="entry in history" :key="entry.id" class="max-w-[85%] rounded-xl px-3 py-2 text-sm" :class="entry.role === 'user'
          ? 'ml-auto bg-primary/10 text-ink'
          : 'border border-line bg-surface text-dim'
          ">
          <p class="whitespace-pre-wrap break-words">{{ entry.content }}</p>
        </div>

        <p v-if="pending" class="text-xs text-mute">Печатает…</p>
      </div>

      <div class="mt-3 flex flex-col gap-1">
        <p v-if="failure" class="text-xs text-error">{{ failure }}</p>

        <div class="flex items-center gap-2">
          <UInput v-model="prompt" size="md" placeholder="Сообщение" :disabled="pending" class="min-w-0 flex-1"
            @keydown.enter.prevent="submit" />

          <UButton type="button" color="primary" size="md" :loading="pending"
            :disabled="pending || prompt.trim().length === 0" @click="submit">Отправить</UButton>
        </div>
      </div>
    </template>
  </section>
</template>

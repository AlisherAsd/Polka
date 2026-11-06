<script setup lang="ts">
import type { Card } from '~/types/card'

/**
 * Модалка «Суммировать ИИ»: промпт + контекст выделенных карточек.
 * Контекст передаётся в `/api/summarize`, ответ показывается ниже формы.
 */
const props = defineProps<{
  /** Карточки, которые попадут в контекст. */
  cards: readonly Card[]
}>()

const { open, closeModal } = useSummarizeModal()

const prompt = ref<string>('Сделай краткое саммари этих материалов.')
const answer = ref<string>('')
const pending = ref<boolean>(false)
const failure = ref<string>('')

function handleOpenChange(value: boolean): void {
  open.value = value

  if (value) {
    answer.value = ''
    failure.value = ''
  }
}

async function submit(): Promise<void> {
  if (pending.value || props.cards.length === 0) {
    return
  }

  pending.value = true
  failure.value = ''
  answer.value = ''

  try {
    const res = await $fetch<{ text: string }>('/api/summarize', {
      method: 'POST',
      body: {
        prompt: prompt.value,
        cards: props.cards.map((card) => ({
          title: card.title,
          description: card.description,
          url: card.url,
          authorName: card.authorName,
        })),
      },
    })

    answer.value = res.text
  } catch (error) {
    failure.value =
      error instanceof Error ? error.message : 'Не удалось получить ответ'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    title="Суммировать ИИ"
    :ui="{ content: 'sm:max-w-2xl' }"
    @update:open="handleOpenChange"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="card in cards"
            :key="card.id"
            color="neutral"
            variant="subtle"
            size="xs"
            :label="card.title"
          />
        </div>

        <UTextarea
          v-model="prompt"
          :rows="3"
          autoresize
          placeholder="Что сделать с выделенными карточками?"
          class="w-full"
        />

        <p v-if="failure" class="text-xs text-error" role="alert">
          {{ failure }}
        </p>

        <div
          v-if="answer"
          class="max-h-64 overflow-y-auto rounded-xl border border-line bg-app p-3"
        >
          <p class="whitespace-pre-wrap text-sm leading-snug text-ink">
            {{ answer }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="md"
          label="Закрыть"
          class="rounded-xl"
          @click="closeModal"
        />
        <UButton
          type="button"
          color="primary"
          variant="solid"
          size="md"
          icon="i-lucide-sparkles"
          label="Суммировать"
          class="rounded-xl px-5"
          :loading="pending"
          :disabled="pending"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { Card } from '~/types/card'
import type { Note } from '~/api/notes'
import { updateItem } from '~/api/items'
import { useCards } from '~/composables/useCards'

/**
 * Модалка «Суммировать ИИ»: промпт + контекст выделенных файлов.
 * В `/api/summarize` уходит текст файлов (заметок); карточки нужны только,
 * чтобы привязать ответ к карточке и обновить её `summary`.
 */
const props = defineProps<{
  /** Файлы (заметки), которые попадут в контекст. */
  notes: readonly Note[]
  /** Карточки выделения: к ним привязывается результат. */
  cards: readonly Card[]
}>()

const { open, closeModal } = useSummarizeModal()
const { cards: stateCards, replaceCard } = useCards()

/** Публичная база API из runtimeConfig (читается здесь, в Nuxt-контексте). */
const apiBase = String(useRuntimeConfig().public.apiBase ?? '')

const prompt = ref<string>('Сделай краткое саммари этих материалов.')
const answer = ref<string>('')
const pending = ref<boolean>(false)
const failure = ref<string>('')

/**
 * Сохраняет ответ ИИ в `summary` карточек — только у тех, где саммари ещё нет,
 * и только если карточка уже лежит на бэкенде (id из БД).
 */
async function persistSummary(cards: readonly Card[], text: string): Promise<void> {
  const summary = text.trim()

  if (summary.length === 0) {
    return
  }

  const known = new Set(stateCards.value.map((card) => card.id))
  const targets = cards.filter((card) => known.has(card.id) && !card.summary)

  await Promise.allSettled(
    targets.map(async (card) => {
      const updated = await updateItem(apiBase, card.id, { summary })

      // Обновляем локальное состояние — без перезагрузки списка.
      replaceCard(updated)
    }),
  )
}

/** Нечего суммировать: нет ни одного файла в выделении. */
const canSubmit = computed<boolean>(() => props.notes.length > 0)

function handleOpenChange(value: boolean): void {
  open.value = value

  if (value) {
    answer.value = ''
    failure.value = ''
  }
}

async function submit(): Promise<void> {
  if (pending.value || props.notes.length === 0) {
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
        // Контекст собирается из файлов: название + их содержимое.
        cards: props.notes.map((note) => ({
          id: note.itemId,
          title: note.title,
          description: note.content,
          url: note.url,
        })),
        // Саммари складывается в `ai-voult` файлом, привязанным к карточке.
        itemId: props.cards.length === 1 ? props.cards[0]?.id : undefined,
      },
    })

    answer.value = res.text
    await persistSummary(props.cards, res.text)

    // Бэкенд сложил саммари файлом в `ai-voult` — обновляем дерево файлов.
    await useFiles().reload()
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
        <!-- Контекст — файлы (заметки), а не карточки -->
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="note in notes"
            :key="note.id"
            color="neutral"
            variant="subtle"
            size="xs"
            :label="note.title"
          />
        </div>

        <p v-if="!canSubmit" class="text-xs text-mute">
          Выберите файлы на доске или карточку с файлом, чтобы собрать контекст.
        </p>

        <UTextarea
          v-model="prompt"
          :rows="3"
          autoresize
          placeholder="Что сделать с выделенными файлами?"
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
          :disabled="pending || !canSubmit"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>

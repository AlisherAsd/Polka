<script setup lang="ts">
import { ref } from 'vue'

/**
 * Модалка «Теги»: присваивает сессионные теги выделенным карточкам.
 * Мультивыбор — готовый компонент Nuxt UI `UInputTags`.
 */

const { open, closeModal } = useTagsModal()
const { cards, selectedIds, clearSelection, setTags } = useCards()

/** Моковые лейблы для быстрого выбора. */
const SUGGESTED_TAGS: readonly string[] = [
  'Дизайн',
  'Разработка',
  'Маркетинг',
  'Видео',
  'Новости',
  'Подкасты',
  'Наука',
  'Путешествия',
]

/** Локальный выбор — при открытии предзаполняется объединением тегов выделенных карточек. */
const selectedTags = ref<string[]>([])

function addSuggested(tag: string): void {
  if (!selectedTags.value.includes(tag)) {
    selectedTags.value = [...selectedTags.value, tag]
  }
}

/** Объединение тегов всех выделенных карточек. */
function collectSelectedTags(): string[] {
  const ids = new Set(selectedIds.value)
  const merged = new Set<string>()

  cards.value.forEach((card) => {
    if (ids.has(card.id)) {
      card.tags?.forEach((tag) => merged.add(tag))
    }
  })

  return [...merged]
}

function handleOpenChange(value: boolean): void {
  open.value = value

  if (value) {
    selectedTags.value = collectSelectedTags()
  }
}

/** Применяет теги к выделенным карточкам и закрывает модалку. */
function apply(): void {
  if (selectedIds.value.length > 0) {
    setTags([...selectedIds.value], selectedTags.value)
  }

  closeModal()
  clearSelection()
}
</script>

<template>
  <UModal :open="open" title="Теги" @update:open="handleOpenChange">
    <template #body>
      <div class="flex flex-col gap-4">
        <UInputTags
          v-model="selectedTags"
          icon="i-lucide-tags"
          placeholder="Добавьте тег и нажмите Enter"
          aria-label="Теги"
          class="w-full"
          :ui="{ base: 'rounded-xl' }"
        />

        <div class="flex flex-col gap-2">
          <p class="text-xs font-medium text-mute">Популярные</p>
          <div class="flex flex-wrap gap-1.5">
            <UButton
              v-for="tag in SUGGESTED_TAGS"
              :key="tag"
              type="button"
              color="neutral"
              :variant="selectedTags.includes(tag) ? 'soft' : 'outline'"
              size="xs"
              :icon="selectedTags.includes(tag) ? 'i-lucide-check' : undefined"
              :label="tag"
              class="rounded-full"
              @click="addSuggested(tag)"
            />
          </div>
        </div>

        <div v-if="selectedTags.length > 0" class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="tag in selectedTags"
            :key="tag"
            color="primary"
            variant="subtle"
            size="sm"
            :label="tag"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end">
        <UButton
          type="button"
          color="primary"
          variant="solid"
          size="md"
          label="Готово"
          class="rounded-xl px-5"
          @click="apply"
        />
      </div>
    </template>
  </UModal>
</template>

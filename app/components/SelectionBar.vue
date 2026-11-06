<script setup lang="ts">
/**
 * Панель действий с выделенными карточками.
 * Появляется, когда `selectedIds` не пуст; рендерится в странице и фиксируется внизу экрана.
 */
const { selectedCount, clearSelection, removeSelected } = useCards()
const { openModal: openTagsModal } = useTagsModal()
const { openModal: openFolderModal } = useFolderModal()
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="translate-y-3 opacity-0"
    leave-active-class="transition duration-100 ease-in"
    leave-to-class="translate-y-3 opacity-0"
  >
    <div
      v-if="selectedCount > 0"
      class="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-lg"
      role="toolbar"
      aria-label="Действия с выделенными карточками"
    >
      <span class="whitespace-nowrap px-1 text-sm font-medium text-ink">
        Выбрано: {{ selectedCount }}
      </span>

      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-tags"
        label="Теги"
        class="rounded-lg"
        @click="openTagsModal"
      />

      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-folder-plus"
        label="В папку"
        class="rounded-lg"
        @click="openFolderModal"
      />

      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-share-2"
        label="Поделиться"
        class="rounded-lg"
      />

      <UButton
        color="neutral"
        variant="soft"
        class="rounded-lg text-error"
        size="sm"
        icon="i-lucide-trash-2"
        label="Удалить"
        @click="removeSelected"
      />

      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-x"
        square
        aria-label="Снять выделение"
        class="rounded-lg"
        @click="clearSelection"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Панель действий с выделенными карточками.
 * Появляется, когда `selectedIds` не пуст; рендерится в странице и фиксируется внизу экрана.
 */
const { selectedCount, clearSelection, removeSelected } = useCards()
const { openModal: openTagsModal } = useTagsModal()
const { openModal: openFolderModal } = useFolderModal()
const { isAuth } = useAuth()

/**
 * На телефоне кнопки показываем без подписей (только иконки) — иначе
 * панель не помещается в ширину экрана. С `sm` подписи возвращаются.
 *
 * `matchMedia` создаётся клиентски в `onMounted`; до гидратации считаем,
 * что подписи есть — так разметка SSR совпадает с первым рендером.
 */
const isMobile = ref<boolean>(false)

let mediaQuery: MediaQueryList | null = null

function syncMobile(): void {
  isMobile.value = mediaQuery?.matches ?? false
}

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 39.9375rem)')
  syncMobile()
  mediaQuery.addEventListener('change', syncMobile)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', syncMobile)
  mediaQuery = null
})

const tagsLabel = computed<string | undefined>(() => (isMobile.value ? undefined : 'Теги'))
const folderLabel = computed<string | undefined>(() => (isMobile.value ? undefined : 'В папку'))
const shareLabel = computed<string | undefined>(() => (isMobile.value ? undefined : 'Поделиться'))
const deleteLabel = computed<string | undefined>(() => (isMobile.value ? undefined : 'Удалить'))
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
      class="fixed bottom-4 left-1/2 z-30 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 rounded-2xl border border-line bg-surface px-2 py-2 shadow-lg sm:gap-2 sm:px-3"
      role="toolbar"
      aria-label="Действия с выделенными карточками"
    >
      <span class="whitespace-nowrap px-1 text-xs font-medium text-ink sm:text-sm">
        Выбрано: {{ selectedCount }}
      </span>

      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-tags"
        :label="tagsLabel"
        class="rounded-lg"
        @click="openTagsModal"
      />

      <AuthRequiredPopover v-if="!isAuth" feature="Папки">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-folder-plus"
          :label="folderLabel"
          class="rounded-lg opacity-40"
          @click.prevent
        />
      </AuthRequiredPopover>

      <UButton
        v-else
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-folder-plus"
        :label="folderLabel"
        class="rounded-lg"
        @click="openFolderModal"
      />

      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-share-2"
        :label="shareLabel"
        class="rounded-lg"
      />

      <UButton
        color="neutral"
        variant="soft"
        class="rounded-lg text-error"
        size="sm"
        icon="i-lucide-trash-2"
        :label="deleteLabel"
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

<script setup lang="ts">
import { computed } from 'vue'
import type { FileNode } from '~/utils/fileTree'

/**
 * Узел дерева файлов. Папки раскрываются, файлы — это заметки из базы
 * (`/api/notes`), клик открывает страницу заметки.
 */
const props = defineProps<{
  node: FileNode
  depth: number
  /** Раскрытые папки. */
  expanded: Record<string, boolean>
}>()

const emit = defineEmits<{
  toggle: [id: string]
}>()

const { closeMenu } = useMobileMenu()
const { closeSidePanel } = useSidePanel()
const { isAuth } = useAuth()
const { openModal: openAuthModal } = useAuthModal()

/** Переход в заметку. На телефоне заодно закрываем меню и панель. */
async function openNote(noteId: string): Promise<void> {
  if (isMobileViewport()) {
    closeMenu()
    closeSidePanel()
  }

  await navigateTo(`/note/${noteId}`)
}

const isFolder = computed<boolean>(() => props.node.type === 'folder')
const isOpen = computed<boolean>(() => props.expanded[props.node.id] === true)

const childFolders = computed<readonly FileNode[]>(() =>
  (props.node.children ?? []).filter((child) => child.type === 'folder'),
)
const childFiles = computed<readonly FileNode[]>(() =>
  (props.node.children ?? []).filter((child) => child.type === 'file'),
)

const hasChildren = computed<boolean>(() => childFolders.value.length > 0 || childFiles.value.length > 0)

const icon = computed<string>(() => {
  if (!isFolder.value) {
    return 'i-lucide-file-text'
  }

  return isOpen.value ? 'i-lucide-folder-open' : 'i-lucide-folder'
})

/** Отступ строки по глубине дерева. */
const indent = computed<string>(() => `${props.depth * 12}px`)

function handleClick(): void {
  // Раньше клик по папке без входа молча ничего не делал — на телефоне это
  // выглядело как «нажатие не срабатывает». Теперь открываем вход.
  if (isFolder.value && !isAuth.value) {
    openAuthModal()

    return
  }

  if (isFolder.value) {
    emit('toggle', props.node.id)

    return
  }

  if (props.node.note) {
    void openNote(props.node.note.id)
  }
}
</script>

<template>
  <li class="min-w-0">
    <!--
      Собственная кнопка вместо `UButton`: на телефоне шторка меню перехватывает
      события указателя, и клик по папке не доходил. Обработчик — нативный.
    -->
    <button
      type="button"
      class="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink transition-colors hover:bg-app focus-visible:bg-app"
      :style="{ paddingLeft: indent }"
      :title="node.name"
      :aria-expanded="isFolder ? isOpen : undefined"
      @click.stop="handleClick"
    >
      <UIcon :name="icon" class="size-4 shrink-0 text-mute" />

      <span class="truncate">{{ node.name }}</span>

      <UIcon
        v-if="isFolder && hasChildren"
        name="i-lucide-chevron-right"
        class="ml-auto size-4 shrink-0 text-mute transition-transform"
        :class="isOpen ? 'rotate-90' : 'rotate-0'"
      />
    </button>

    <ul v-if="isFolder && isOpen && hasChildren" class="flex flex-col gap-0.5">
      <FileTreeNode
        v-for="child in childFolders"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :expanded="expanded"
        @toggle="emit('toggle', $event)"
      />

      <FileTreeNode
        v-for="file in childFiles"
        :key="file.id"
        :node="file"
        :depth="depth + 1"
        :expanded="expanded"
        @toggle="emit('toggle', $event)"
      />
    </ul>
  </li>
</template>

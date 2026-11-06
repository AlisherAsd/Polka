<script setup lang="ts">
import { computed } from 'vue'
import type { FileNode } from '~/data/fileTree'

/**
 * Узел дерева базы знаний. Рекурсивный.
 * Папки наполняются карточками: теми, у которых `folderId` совпадает с id папки.
 */
const props = defineProps<{
  node: FileNode
  depth: number
  expanded: Record<string, boolean>
}>()

const emit = defineEmits<{
  toggle: [id: string]
}>()

const { cardsInFolder } = useCards()

const isFolder = computed<boolean>(() => props.node.type === 'folder')
const isOpen = computed<boolean>(() => props.expanded[props.node.id] === true)

/** Карточки, «положенные» в эту папку. */
const folderCards = computed(() => (isFolder.value ? cardsInFolder(props.node.id) : []))

const childFolders = computed<readonly FileNode[]>(() =>
  (props.node.children ?? []).filter((child) => child.type === 'folder'),
)

const hasChildren = computed<boolean>(
  () => childFolders.value.length > 0 || folderCards.value.length > 0,
)

const icon = computed<string>(() => {
  if (!isFolder.value) {
    return 'i-lucide-file'
  }

  return isOpen.value ? 'i-lucide-folder-open' : 'i-lucide-folder'
})

/** Отступ строки по глубине дерева. */
const indent = computed<string>(() => `${props.depth * 12}px`)

function handleClick(): void {
  if (isFolder.value) {
    emit('toggle', props.node.id)
  }
}
</script>

<template>
  <li class="min-w-0">
    <UButton
      type="button"
      color="neutral"
      variant="ghost"
      size="sm"
      :icon="icon"
      :label="node.name"
      class="w-full justify-start rounded-lg"
      :style="{ paddingLeft: indent }"
      :aria-expanded="isFolder ? isOpen : undefined"
      @click="handleClick"
    >
      <template v-if="isFolder" #trailing>
        <UIcon
          v-if="hasChildren"
          name="i-lucide-chevron-right"
          class="size-4 text-mute transition-transform"
          :class="isOpen ? 'rotate-90' : 'rotate-0'"
        />
      </template>
    </UButton>

    <ul v-if="isFolder && isOpen && hasChildren" class="flex flex-col gap-0.5">
      <FileTreeNode
        v-for="child in childFolders"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :expanded="expanded"
        @toggle="emit('toggle', $event)"
      />

      <li
        v-for="card in folderCards"
        :key="card.id"
        class="truncate px-2 py-1 text-xs text-dim"
        :style="{ paddingLeft: `${(depth + 1) * 12 + 8}px` }"
        :title="card.title"
      >
        {{ card.title }}
      </li>
    </ul>
  </li>
</template>

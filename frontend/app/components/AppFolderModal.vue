<script setup lang="ts">
import { ref } from 'vue'
import { FILE_TREE } from '~/data/fileTree'
import type { FileNode } from '~/data/fileTree'

/**
 * Модалка «В папку»: выбирает папку для выделенных карточек.
 * Доступные папки берутся из того же мокового дерева, что и вторая панель.
 */

const { open, closeModal } = useFolderModal()
const { selectedIds, cards, clearSelection, setFolder } = useCards()

/** Выбранная папка (id узла). */
const selectedFolderId = ref<string>('')

/** Только папки (файлы выбирать бессмысленно). */
function flattenFolders(nodes: readonly FileNode[], depth = 0): { id: string; name: string; depth: number }[] {
  return nodes.flatMap((node) => {
    if (node.type !== 'folder') {
      return []
    }

    const self = { id: node.id, name: node.name, depth }

    return [self, ...flattenFolders(node.children ?? [], depth + 1)]
  })
}

const FOLDERS = flattenFolders(FILE_TREE)

/** Название папки текущей выделенной карточки — как значение по умолчанию. */
function currentFolderName(): string {
  const first = cards.value.find((card) => selectedIds.value.includes(card.id))

  return first?.folder ?? ''
}

function handleOpenChange(value: boolean): void {
  open.value = value

  if (value) {
    const current = currentFolderName()
    const match = FOLDERS.find((folder) => folder.name === current)

    selectedFolderId.value = match ? match.id : ''
  }
}

function apply(): void {
  const folder = FOLDERS.find((item) => item.id === selectedFolderId.value)

  if (folder && selectedIds.value.length > 0) {
    setFolder([...selectedIds.value], folder.name, folder.id)
  }

  closeModal()
  clearSelection()
}
</script>

<template>
  <UModal :open="open" title="Переместить в папку" @update:open="handleOpenChange">
    <template #body>
      <div class="flex flex-col gap-1">
        <UButton
          v-for="folder in FOLDERS"
          :key="folder.id"
          type="button"
          color="neutral"
          :variant="selectedFolderId === folder.id ? 'soft' : 'ghost'"
          size="sm"
          :icon="selectedFolderId === folder.id ? 'i-lucide-folder-check' : 'i-lucide-folder'"
          :label="folder.name"
          class="w-full justify-start rounded-lg"
          :style="{ paddingLeft: `${12 + folder.depth * 16}px` }"
          @click="selectedFolderId = folder.id"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="md"
          label="Отмена"
          class="rounded-xl"
          @click="closeModal"
        />
        <UButton
          type="button"
          color="primary"
          variant="solid"
          size="md"
          icon="i-lucide-folder-input"
          label="Переместить"
          class="rounded-xl px-5"
          :disabled="selectedFolderId.length === 0"
          @click="apply"
        />
      </div>
    </template>
  </UModal>
</template>

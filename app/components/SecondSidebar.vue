<script setup lang="ts">
import { ref } from 'vue'
import { FILE_TREE } from '~/data/fileTree'

/**
 * Вторая панель — моковая файловая структура.
 * Шириной/выездом управляет обёртка в layout (`useSidePanel`), здесь только дерево.
 */

/** Раскрытые папки дерева. */
const expanded = ref<Record<string, boolean>>({})

function handleToggle(id: string): void {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] }
}
</script>

<template>
  <aside
    class="flex h-full w-56 shrink-0 flex-col gap-0.5 bg-surface p-3"
    aria-label="Файлы"
  >
    <p class="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-mute">
      Файлы
    </p>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <FileTreeNode
        v-for="node in FILE_TREE"
        :key="node.id"
        :node="node"
        :depth="0"
        :expanded="expanded"
        @toggle="handleToggle"
      />
    </div>
  </aside>
</template>

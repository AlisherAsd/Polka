<script setup lang="ts">
import { onMounted, ref } from 'vue'

/**
 * Вторая панель — дерево папок и заметок с бэкенда (`/api/folders`, `/api/notes`).
 * Шириной/выездом управляет обёртка в layout (`useSidePanel`), здесь только дерево.
 */
const { tree, error, init } = useFiles()

/** Раскрытые папки дерева. */
const expanded = ref<Record<string, boolean>>({ knowledge: true })

/** Папки доступны только после входа. */
const { isAuth } = useAuth()

onMounted(() => {
  // Данные грузятся только на клиенте: SSR рендерит пустое дерево.
  init()
})

function handleToggle(id: string): void {
  if (!isAuth.value) {
    return
  }

  expanded.value = { ...expanded.value, [id]: !expanded.value[id] }
}
</script>

<template>
  <aside
    class="flex h-full w-full flex-col gap-0.5 bg-surface p-3"
    aria-label="Файлы"
  >
    <p class="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-mute">
      Файлы
    </p>

    <p v-if="error" class="px-2 text-xs text-[#b3261e]">{{ error }}</p>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <FileTreeNode
        v-for="node in tree"
        :key="node.id"
        :node="node"
        :depth="0"
        :expanded="expanded"
        @toggle="handleToggle"
      />
    </div>
  </aside>
</template>

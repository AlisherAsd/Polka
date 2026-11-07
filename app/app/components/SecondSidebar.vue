<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

/**
 * Вторая панель — дерево папок и заметок с бэкенда (`/api/folders`, `/api/notes`).
 * Шириной/выездом управляет обёртка в layout (`useSidePanel`), здесь только дерево.
 */
const { tree, error, init } = useFiles()

/** Раскрытые папки: корень открыт, вложенные — по клику. */
const expanded = computed<Record<string, boolean>>(() => ({
  knowledge: true,
  ...toggled.value,
}))

/** Ручные переключения пользователя поверх дефолта. */
const toggled = ref<Record<string, boolean>>({})

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

  toggled.value = { ...toggled.value, [id]: !(toggled.value[id] ?? false) }
}
</script>

<template>
  <aside
    class="flex h-full w-full min-w-0 flex-col items-stretch gap-0.5 overflow-hidden bg-surface p-3 text-left"
    aria-label="Файлы"
  >
    <p class="w-full px-2 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-mute">
      Файлы
    </p>

    <p v-if="error" class="px-2 text-xs text-[#b3261e]">{{ error }}</p>

    <!-- Гость: файлы и папки скрыты -->
    <AuthGate
      v-if="!isAuth"
      feature="Файлы"
      description="Папки и заметки доступны после входа."
      compact
    />

    <!-- Список прижат к левому краю: при растягивании панели дерево не центрируется -->
    <div v-else class="min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
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

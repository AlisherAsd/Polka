<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useApiBase } from '~/api/client'
import { createFolder as createFolderRequest } from '~/api/notes'

/**
 * Вторая панель — дерево папок и заметок с бэкенда (`/api/folders`, `/api/notes`).
 * Шириной/выездом управляет обёртка в layout (`useSidePanel`), здесь только дерево.
 */
const { tree, error, init, rootFolder, topFolders, reload } = useFiles()
const notify = useNotify()
const confirm = useConfirm()
const apiBase = useApiBase()
const { openModal: openNoteModal } = useNoteModal()

/** Создание новой верхней папки — сразу с доской (серверная логика). */
const creatingFolder = ref<boolean>(false)

async function handleCreateFolder(): Promise<void> {
  // `window.prompt` в Tauri не поддерживается — спрашиваем через свою модалку.
  const name = await confirm.ask({
    title: 'Новая папка',
    description: 'Папка создаётся вместе с собственной доской.',
    confirmLabel: 'Создать',
    input: 'Название папки',
  })

  if (typeof name !== 'string' || creatingFolder.value) {
    return
  }

  creatingFolder.value = true

  try {
    await createFolderRequest(apiBase, { name })
    await reload()
    notify.success(`Папка «${name}» создана`)
  } catch (err) {
    notify.fail(err, 'Не удалось создать папку')
  } finally {
    creatingFolder.value = false
  }
}

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
  // Раскрытие папок работает и без входа: дерево остаётся обозреваемым.
  toggled.value = { ...toggled.value, [id]: !(toggled.value[id] ?? false) }
}
</script>

<template>
  <aside
    class="flex h-full w-full min-w-0 flex-col items-stretch gap-0.5 overflow-hidden bg-surface p-3 text-left"
    aria-label="Файлы"
  >
    <div class="flex w-full items-center justify-between gap-1 px-2 pb-1">
      <p class="text-left text-xs font-semibold uppercase tracking-wide text-mute">Файлы</p>

      <UButton
        v-if="isAuth"
        type="button"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-plus"
        square
        aria-label="Новая папка"
        title="Новая папка"
        :loading="creatingFolder"
        @click="handleCreateFolder"
      />

      <UButton
        v-if="isAuth"
        type="button"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-file-plus"
        square
        aria-label="Новая заметка"
        title="Новая заметка"
        @click="openNoteModal"
      />
    </div>

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

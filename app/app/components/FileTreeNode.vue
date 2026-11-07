<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FileNode } from '~/utils/fileTree'
import { createShare } from '~/api/shares'
import { apiUrl, useApiBase } from '~/api/client'

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
const { removeFolder, removeNote, copyFolder } = useFiles()
const boardTabs = useBoardTabs()

/**
 * Клик по папке открывает её доску на странице «Доска» (в новой вкладке-табе),
 * а не отдельным маршрутом. Второй клик по уже открытой — просто переключает.
 */
async function openFolderBoard(): Promise<void> {
  boardTabs.restore()
  boardTabs.open(props.node.id, props.node.name)

  await navigateTo({ path: '/board', query: { folder: props.node.id } })
}
const confirm = useConfirm()
const notify = useNotify()
const apiBase = useApiBase()

/** Служебную `ai-voult` удалить нельзя. */
const isServiceFolder = computed<boolean>(() => props.node.id === 'ai-voult')
const canDelete = computed<boolean>(() => isAuth.value && props.node.id !== 'knowledge' && !isServiceFolder.value)

const pending = ref<boolean>(false)

/**
 * Публичная ссылка на папку: копируется в буфер, чтобы её можно было отправить.
 * У файлов публикации нет — делится папка целиком.
 */
async function handleShare(): Promise<void> {
  if (!isAuth.value || !isFolder.value) {
    return
  }

  try {
    const share = await createShare(apiBase, { kind: 'folder', refId: props.node.id })
    const url = `${window.location.origin}${apiUrl('', share.url)}`

    await navigator.clipboard.writeText(url)
    notify.success('Ссылка скопирована', 'Подборка опубликована')
  } catch (error) {
    notify.fail(error, 'Не удалось опубликовать')
  }
}

/** Копия папки вместе с её доской. */
async function handleCopy(): Promise<void> {
  if (!isFolder.value) {
    return
  }

  await copyFolder(props.node.id)
}

/** Удаление папки или файла: подтверждение своей модалкой, тост по итогу. */
async function handleDelete(): Promise<void> {
  if (pending.value) {
    return
  }

  const label = isFolder.value ? 'папку' : 'файл'
  const hint = isFolder.value
    ? ' Файлы внутри останутся и переедут в корень.'
    : ''

  // `window.confirm` в Tauri не работает (диалог не показывается) — своя модалка.
  const confirmed = await confirm.ask({
    title: `Удалить ${label} «${props.node.name}»?`,
    description: hint.trim(),
    confirmLabel: 'Удалить',
    danger: true,
  })

  if (!confirmed) {
    return
  }

  pending.value = true

  try {
    if (isFolder.value) {
      await removeFolder(props.node.id)
    } else {
      await removeNote(props.node.id)
    }
  } catch {
    // Ошибка уже показана тостом в `useFiles`.
  } finally {
    pending.value = false
  }
}

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

/**
 * Отступ строки по глубине дерева. Ограничен 48px (4 уровня), чтобы на узкой
 * панели название не оставалось без места.
 */
const indent = computed<string>(() => `${Math.min(props.depth * 12, 48)}px`)

function handleClick(): void {
  // Папка: обычный клик раскрывает дерево (доска — через меню «⋯»).
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
  <li class="block w-full min-w-0 max-w-full">
    <!--
      Собственная кнопка вместо `UButton`: на телефоне шторка меню перехватывает
      события указателя, и клик по папке не доходил. Обработчик — нативный.
    -->
    <button type="button"
      class="group flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-left text-sm text-ink transition-colors hover:bg-app focus-visible:bg-app"
      :style="{ paddingLeft: indent }" :title="node.name" :aria-expanded="isFolder ? isOpen : undefined"
      @click.stop="handleClick">
      <UIcon :name="icon" class="size-4 shrink-0 text-mute" />

      <!--
        Название занимает остаток строки и обрезается: длинные заголовки файлов
        и папок не растягивают панель. Полный текст — в `title` и в подсказке.
      -->
      <span class="block min-w-0 flex-1 truncate" :title="node.name">{{ node.name }}</span>

      <UIcon v-if="isFolder && hasChildren" name="i-lucide-chevron-right"
        class="size-4 shrink-0 text-mute transition-transform" :class="isOpen ? 'rotate-90' : 'rotate-0'" />

      <!-- Действия в одном меню: копировать, клонировать, удалить, к доске -->
      <UPopover
        v-if="isFolder && isAuth"
        :content="{ side: 'bottom', align: 'start', sideOffset: 6 }"
      >
        <button
          type="button"
          class="shrink-0 rounded-md p-0.5 text-mute opacity-0 transition-opacity hover:bg-app hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
          :aria-label="`Действия с папкой «${node.name}»`"
          :title="`Действия с папкой «${node.name}»`"
          @click.stop
          @pointerdown.stop
        >
          <UIcon name="i-lucide-ellipsis-vertical" class="size-3.5" />
        </button>

        <template #content>
          <div class="flex w-44 flex-col p-1 text-xs">
            <button type="button" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-ink hover:bg-app" @click.stop="handleShare">
              <UIcon name="i-lucide-link" class="size-3.5 text-mute" />
              Скопировать ссылку
            </button>

            <button type="button" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-ink hover:bg-app" @click.stop="handleCopy">
              <UIcon name="i-lucide-copy" class="size-3.5 text-mute" />
              Клонировать
            </button>

            <button type="button" class="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-ink hover:bg-app" @click.stop="openFolderBoard">
              <UIcon name="i-lucide-layout-dashboard" class="size-3.5 text-mute" />
              Перейти к доске
            </button>

            <button
              type="button"
              class="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[#b3261e] hover:bg-app"
              @click.stop="handleDelete"
            >
              <UIcon name="i-lucide-trash-2" class="size-3.5" />
              Удалить
            </button>
          </div>
        </template>
      </UPopover>
    </button>

    <ul v-if="isFolder && isOpen && hasChildren" class="flex min-w-0 flex-col gap-0.5 overflow-hidden">
      <FileTreeNode v-for="child in childFolders" :key="child.id" :node="child" :depth="depth + 1" :expanded="expanded"
        @toggle="emit('toggle', $event)" />

      <FileTreeNode v-for="file in childFiles" :key="file.id" :node="file" :depth="depth + 1" :expanded="expanded"
        @toggle="emit('toggle', $event)" />
    </ul>
  </li>
</template>

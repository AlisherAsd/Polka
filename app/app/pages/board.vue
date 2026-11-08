<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { Card } from '~/types/card'
import type { Note } from '~/api/notes'
import {
  createShare as createShareRequest,
  fetchShares as fetchSharesRequest,
  revokeShare as revokeShareRequest,
} from '~/api/shares'
import type { Share } from '~/api/shares'
import { useApiBase } from '~/api/client'

/**
 * Страница «Доска»: табы открытых досок и холст на Vue Flow.
 *
 * Холст даёт сама библиотека (бесконечное поле, пан, зум, миникарта,
 * выделение, перетаскивание), страница отвечает за данные: какую доску
 * показать, публикацию и сохранение позиций.
 */
const { placed, links, init: initBoard, initShared, sharedTitle, sharedAuthor, moveNode } = useBoard()
const { notes, topFolders, rootFolder } = useFiles()
const { tabs, activeId, restore, open, activate, close, rename, prune } = useBoardTabs()
const route = useRoute()
const router = useRouter()
const apiBase = useApiBase()
const notify = useNotify()
const createShare = createShareRequest

/** Активная доска: из адреса (`?folder=`) или последняя открытая вкладка. */
const folderId = computed<string>(() => String(route.query.folder ?? activeId.value ?? ''))
const queryFolder = computed<string>(() => String(route.query.folder ?? ''))
/** Публичная доска: `/board?share=<slug>` — открывается без входа, только чтение. */
const shareSlug = computed<string>(() => String(route.query.share ?? ''))
/** Доска без интерфейса приложения — открывается в новой вкладке. */
const fullView = computed<boolean>(() => String(route.query.full ?? '') === '1')
const currentFolder = computed(() => topFolders.value.find((folder) => folder.id === folderId.value) ?? null)
const boardTitle = computed<string>(() =>
  shareSlug.value
    ? (sharedTitle.value ?? 'Доска')
    : (currentFolder.value?.name ?? 'Доска'),
)

/** Первая буква email — для кружка-аватара автора публичной доски. */
const authorInitial = computed<string>(() => {
  const email = sharedAuthor.value?.trim() ?? ''

  return email.length > 0 ? email[0]!.toUpperCase() : '?'
})

const folderMissing = computed<boolean>(
  () => !shareSlug.value
    && topFolders.value.length > 0
    && folderId.value.length > 0
    && currentFolder.value === null,
)

/** Публичные ссылки пользователя: по ним видно, опубликована ли доска. */
const shares = ref<Share[]>([])
const sharing = ref<boolean>(false)

/**
 * Публичные ссылки активной папки: доска публикуется как доска или как папка
 * (страница `/board?share=` у них одна и та же), поэтому считаем обе.
 */
const folderShares = computed<Share[]>(() => {
  const folder = currentFolder.value

  if (!folder) {
    return []
  }

  return shares.value.filter((share) =>
    (share.kind === 'board' && share.refId === folder.boardId)
    || (share.kind === 'folder' && share.refId === folder.id),
  )
})

/** Первая ссылка папки (если публикаций нет — `null`). */
const boardShare = computed<Share | null>(() => folderShares.value[0] ?? null)

/** Перечитывает ссылки; при ошибке считаем, что публикаций нет. */
async function loadShares(): Promise<void> {
  if (!isAuth.value) {
    shares.value = []

    return
  }

  try {
    shares.value = await fetchSharesRequest(apiBase)
  } catch {
    shares.value = []
  }
}

/** Ссылка на полноэкранный вид текущей доски. */
function fullBoardHref(): string {
  const query = shareSlug.value
    ? { share: shareSlug.value, full: '1' }
    : { folder: folderId.value, full: '1' }

  return router.resolve({ path: '/board', query }).href
}

/**
 * «Открыть полностью»: в браузере — новая вкладка, в нативном приложении —
 * тот же экран (Tauri без плагина не открывает новые окна).
 */
async function openFullBoard(): Promise<void> {
  const href = fullBoardHref()

  if (isNativeApp()) {
    await navigateTo(href)

    return
  }

  const opened = window.open(href, '_blank', 'noopener,noreferrer')

  if (!opened) {
    await navigateTo(href)
  }
}

/** Кнопка с двумя состояниями: опубликовать доску или снова сделать приватной. */
async function toggleBoardVisibility(): Promise<void> {
  const folder = currentFolder.value
  const existing = boardShare.value

  if (!folder || sharing.value) {
    return
  }

  sharing.value = true

  try {
    if (existing) {
      // Список мог устареть: перечитываем и снимаем все ссылки папки.
      await loadShares()

      const revoke = [...folderShares.value]

      await Promise.all(revoke.map((share) => revokeShareRequest(apiBase, share.slug)))
      await loadShares()
      notify.success('Доска снова приватная')
    } else {
      const share = await createShare(apiBase, { kind: 'board', refId: folder.boardId ?? undefined })
      // В нативе origin — `tauri://localhost`, делимся публичным адресом API.
      const url = publicShareUrl(apiBase, share.url)

      await loadShares()

      if (await copyText(url)) {
        notify.success('Ссылка скопирована', 'Доска опубликована')
      } else {
        notify.error(url, 'Скопируйте ссылку вручную')
      }
    }
  } catch (error) {
    notify.fail(error, existing ? 'Не удалось сделать приватной' : 'Не удалось опубликовать доску')
  } finally {
    sharing.value = false
  }
}

/** Клик по табу. */
function switchTab(id: string): void {
  activate(id)
  void router.replace({ query: { ...route.query, folder: id } })
}

/** Закрытие таба активной доски — переход на соседнюю. */
function closeTab(id: string): void {
  close(id)

  if (activeId.value) {
    void router.replace({ query: { ...route.query, folder: activeId.value } })
  } else {
    void router.replace({ query: {} })
  }
}

const { openModal: openSummarize } = useSummarizeModal()

/** Саммари требует доступ к ИИ (свой ключ или премиум) и вход в аккаунт. */
const { canUseAi } = useAiKey()
const { openModal: openKeyModal } = useAiKeyModal()
const { openModal: openAuthModal } = useAuthModal()
const { isAuth } = useAuth()

// Вход подтягивается после старта — список ссылок грузим, когда он появился.
watch(isAuth, (authorized) => {
  if (authorized) {
    void loadShares()

    return
  }

  shares.value = []
}, { immediate: true })

// Переключились на другую папку — обновляем и её состояние публикации.
watch(currentFolder, (folder) => {
  if (folder && !shareSlug.value) {
    void loadShares()
  }
})

/** id выделенных узлов (карточек и файлов). */
const selectedIds = ref<string[]>([])

/**
 * Режим выбора для телефона: на тач-экране нет Shift, поэтому включаем
 * отдельную кнопку, где тапы по узлам добавляют/убирают их из выделения.
 */
const multiSelect = ref<boolean>(false)

function toggleMultiSelect(): void {
  multiSelect.value = !multiSelect.value

  if (!multiSelect.value) {
    selectedIds.value = []
  }
}

/** Тап по узлу в режиме мультивыбора. */
function handleFlowToggle(key: string): void {
  selectedIds.value = selectedIds.value.includes(key)
    ? selectedIds.value.filter((item) => item !== key)
    : [...selectedIds.value, key]
}

onMounted(() => {
  // Публичная доска: свои вкладки и данные не трогаем, грузим чужую доску.
  if (shareSlug.value) {
    void initShared(shareSlug.value)

    return
  }

  restore()

  const fromQuery = queryFolder.value

  if (fromQuery) {
    open(fromQuery, topFolders.value.find((folder) => folder.id === fromQuery)?.name)
  } else if (rootFolder.value) {
    open(rootFolder.value.id, rootFolder.value.name)
  }

  if (folderId.value) {
    void initBoard(folderId.value)
  }
})

// Папки догрузились: чистим вкладки удалённых и подтягиваем названия.
watch(topFolders, (folders) => {
  if (shareSlug.value || folders.length === 0) {
    return
  }

  prune(folders.map((folder) => folder.id))

  for (const tab of tabs.value) {
    const folder = folders.find((item) => item.id === tab.folderId)

    if (folder) {
      rename(tab.folderId, folder.name)
    }
  }

  if (!folderId.value && rootFolder.value) {
    open(rootFolder.value.id, rootFolder.value.name)
    void initBoard(rootFolder.value.id)
  }
})

// Переключение вкладки — адрес и загрузка узлов этой доски.
watch(folderId, (next) => {
  if (shareSlug.value || !next) {
    return
  }

  multiSelect.value = false
  selectedIds.value = []

  activate(next)

  if (queryFolder.value !== next) {
    void router.replace({ query: { ...route.query, folder: next } })
  }

  void initBoard(next)
})

// Переход между публичными ссылками (или выход из режима просмотра).
watch(shareSlug, (next) => {
  multiSelect.value = false
  selectedIds.value = []

  if (next) {
    void initShared(next)

    return
  }

  if (folderId.value) {
    void initBoard(folderId.value)
  }
})

const isEmpty = computed<boolean>(() => placed.value.length === 0)

/** Карточки из выделения: к ним привязывается результат саммари. */
const selectedCards = computed<Card[]>(() =>
  placed.value
    .filter((item): item is Extract<typeof item, { kind: 'card' }> =>
      item.kind === 'card' && selectedIds.value.includes(item.key),
    )
    .map((item) => item.card),
)

/**
 * Контекст для ИИ — файлы (заметки) из выделения. Если выделены только карточки,
 * берём их файлы: один файл на карточку (`notes.item_id`).
 */
const selectedNotes = computed<Note[]>(() => {
  const picked = new Set(selectedIds.value)
  const direct = placed.value
    .filter((item): item is Extract<typeof item, { kind: 'file' }> => item.kind === 'file')
    .filter((item) => picked.has(item.key))
    .map((item) => item.note)

  if (direct.length > 0) {
    return direct
  }

  const cardIds = new Set(selectedCards.value.map((card) => card.id))

  return notes.value.filter((note) => Boolean(note.itemId) && cardIds.has(note.itemId as string))
})

/** Vue Flow: узел перетащили — сохраняем позицию. */
function handleFlowMove(key: string, x: number, y: number): void {
  moveNode(key, x, y)
}

/** Vue Flow: изменилось выделение. */
function handleFlowSelect(keys: string[]): void {
  selectedIds.value = keys
}
</script>

<template>
  <section
    class="flex min-h-0 w-full flex-1 flex-col"
    :class="fullView ? 'h-dvh bg-app' : ''"
  >
    <!-- Табы открытых досок: один таб = доска одной папки -->
    <div
      v-if="!fullView && !shareSlug && tabs.length > 0"
      class="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-line bg-surface px-2 py-1.5 sm:px-4"
      role="tablist"
      aria-label="Открытые доски"
    >
      <div
        v-for="tab in tabs"
        :key="tab.folderId"
        class="group flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 transition-colors"
        :class="tab.folderId === folderId
          ? 'border-line bg-app text-ink'
          : 'border-transparent text-dim hover:bg-app/60'"
        role="tab"
        :aria-selected="tab.folderId === folderId"
      >
        <button
          type="button"
          class="flex min-w-0 items-center gap-1.5 text-xs"
          :title="tab.name"
          @click="switchTab(tab.folderId)"
        >
          <UIcon name="i-lucide-layout-dashboard" class="size-3.5 shrink-0 text-mute" />
          <span class="max-w-[160px] truncate">{{ tab.name }}</span>
        </button>

        <UIcon
          name="i-lucide-x"
          class="size-3.5 shrink-0 cursor-pointer text-mute opacity-60 transition-opacity hover:text-ink hover:opacity-100"
          role="button"
          tabindex="0"
          :aria-label="`Закрыть доску «${tab.name}»`"
          @click.stop="closeTab(tab.folderId)"
          @keydown.enter.prevent.stop="closeTab(tab.folderId)"
        />
      </div>
    </div>

    <!-- Шапка: название (и автор публичной доски), ниже — кнопки-иконки -->
    <header class="flex flex-col gap-1 px-3 py-2 sm:px-8">
      <div class="flex min-w-0 items-center gap-2">
        <h1 class="max-w-[220px] truncate text-base font-semibold leading-none text-ink sm:text-lg">{{ boardTitle }}</h1>

        <!-- Публичная доска: только кружок с первой буквой, email — в подсказке -->
        <UTooltip
          v-if="shareSlug && sharedAuthor"
          :text="`Это доска пользователя «${sharedAuthor}»`"
          :delay-duration="150"
        >
          <span
            class="flex size-5 shrink-0 cursor-default items-center justify-center rounded-full bg-primary text-[10px] font-semibold uppercase leading-none text-white"
          >
            {{ authorInitial }}
          </span>
        </UTooltip>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        <!-- Телефон: режим выбора нескольких; на десктопе не нужен -->
        <UButton
          v-if="!shareSlug"
          type="button"
          color="neutral"
          :variant="multiSelect ? 'solid' : 'outline'"
          size="xs"
          :icon="multiSelect ? 'i-lucide-check' : 'i-lucide-list-checks'"
          :label="multiSelect ? 'Готово' : 'Выбрать'"
          :class="['touch-only rounded-lg', multiSelect ? '!border-ink !bg-ink !text-white' : '']"
          @click="toggleMultiSelect"
        />

        <!-- Публичная доска: открыть без интерфейса приложения -->
        <UButton
          v-if="shareSlug && !fullView"
          type="button"
          color="neutral"
          variant="outline"
          size="xs"
          icon="i-lucide-maximize-2"
          label="Открыть полностью"
          class="rounded-lg"
          @click="openFullBoard"
        />

        <!-- Полноэкранный режим: на главную -->
        <UButton
          v-if="fullView"
          to="/"
          color="neutral"
          variant="outline"
          size="xs"
          icon="i-lucide-house"
          label="На главную"
          class="rounded-lg"
        />

        <UButton
          v-if="!fullView && !shareSlug && isAuth && currentFolder"
          type="button"
          color="neutral"
          variant="outline"
          size="xs"
          :icon="boardShare ? 'i-lucide-lock' : 'i-lucide-share-2'"
          :label="boardShare ? 'Сделать приватной' : 'Сделать публичной'"
          class="rounded-lg"
          :loading="sharing"
          @click="toggleBoardVisibility"
        />

        <!-- Своя доска без интерфейса -->
        <UButton
          v-if="!fullView && !shareSlug && isAuth && currentFolder"
          type="button"
          color="neutral"
          variant="outline"
          size="xs"
          icon="i-lucide-maximize-2"
          label="Открыть полностью"
          class="rounded-lg"
          @click="openFullBoard"
        />
      </div>
    </header>

    <div class="relative min-h-0 flex-1 bg-app">
      <!-- Нет ни одной открытой доски (вкладки закрыты) -->
      <EmptyState
        v-if="!fullView && !shareSlug && tabs.length === 0"
        title="Откройте доску"
        description="Нажмите на папку в панели «Файлы» — её доска откроется здесь во вкладке."
        class="mx-auto max-w-md"
      />

      <EmptyState
        v-else-if="folderMissing"
        :image="undefined"
        title="Папка не найдена"
        description="Возможно, ссылка устарела или доска принадлежит другому аккаунту."
        action-label="К «Моим знаниям»"
        class="mx-auto max-w-md"
        @action="rootFolder && switchTab(rootFolder.id)"
      />

      <EmptyState
        v-else-if="isEmpty"
        title="На доске пока пусто"
        description="Добавьте ссылки на главной — они появятся здесь, чтобы раскладывать их по холсту."
        class="mx-auto max-w-md"
      />

      <!-- Бесконечный холст на Vue Flow (только на клиенте: данные и drag) -->
      <ClientOnly v-else>
        <BoardFlow
          :nodes="placed"
          :links="links"
          :selected="selectedIds"
          :multi-select="multiSelect"
          :readonly="Boolean(shareSlug)"
          @move="handleFlowMove"
          @select="handleFlowSelect"
          @toggle="handleFlowToggle"
        />
      </ClientOnly>
    </div>

    <!-- Кнопка суммаризации выделенных (в публичной доске не нужна) -->
    <div
      v-if="!shareSlug && selectedIds.length > 0"
      class="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center"
    >
      <!-- Без доступа к ИИ кнопка заперта: подсказка «свой ключ или премиум» -->
      <AiFeaturePopover v-if="!canUseAi" feature="Суммировать ИИ">
        <UButton
          type="button"
          color="neutral"
          variant="solid"
          size="md"
          icon="i-lucide-lock"
          :label="`Суммировать ИИ · ${selectedIds.length}`"
          class="pointer-events-auto cursor-not-allowed rounded-full px-5 shadow-lg opacity-60"
          aria-disabled="true"
          @click.stop="isAuth ? openKeyModal() : openAuthModal()"
        />
      </AiFeaturePopover>

      <UButton
        v-else
        type="button"
        color="primary"
        variant="solid"
        size="md"
        icon="i-lucide-sparkles"
        :label="`Суммировать ИИ · ${selectedIds.length}`"
        class="pointer-events-auto rounded-full px-5 shadow-lg"
        @click="openSummarize"
      />
    </div>

    <AppSummarizeModal :notes="selectedNotes" :cards="selectedCards" />
  </section>
</template>

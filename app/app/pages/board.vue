<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Card } from '~/types/card'
import type { Note } from '~/api/notes'
import { createShare as createShareRequest, fetchShares as fetchSharesRequest, revokeShare as revokeShareRequest } from '~/api/shares'
import type { Share } from '~/api/shares'
import { useApiBase } from '~/api/client'

/**
 * Страница «Доска»: сверху табы открытых досок (по одному на папку),
 * ниже — холст активной доски.
 *
 * Доска открывается кликом по папке в панели «Файлы». Активная вкладка
 * фиксируется в адресе (`/board?folder=<id>`), поэтому ссылкой можно
 * поделиться, а после перезагрузки контекст сохраняется.
 */
const { cards } = useCards()
const { placed, links, init: initBoard, initShared, sharedTitle, sharedAuthor, moveNode } = useBoard()
const { notes, topFolders, rootFolder } = useFiles()
const { tabs, activeId, restore, open, activate, close, rename, prune } = useBoardTabs()
const route = useRoute()
const router = useRouter()
const apiBase = useApiBase()
const notify = useNotify()
const createShare = createShareRequest

/** Полноэкранный режим публичной доски: `/board?share=<slug>&full=1`. */
/** Активная доска: из адреса (`?folder=`) или последняя открытая вкладка. */
const folderId = computed<string>(() => String(route.query.folder ?? activeId.value ?? ''))
const queryFolder = computed<string>(() => String(route.query.folder ?? ''))
/** Публичная доска: `/board?share=<slug>` — открывается без входа, только чтение. */
const shareSlug = computed<string>(() => String(route.query.share ?? ''))
/** Публичная доска без хедера и сайдбара — открывается в новой вкладке. */
const fullView = computed<boolean>(
  () => shareSlug.value.length > 0 && String(route.query.full ?? '') === '1',
)
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

// Список ссылок грузим, когда станет известен вход (watch ниже, после isAuth).

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
      // Список мог устареть (ссылку на папку могли создать в другой вкладке),
      // поэтому перед отзывом перечитываем его и снимаем все ссылки папки.
      await loadShares()

      const revoke = [...folderShares.value]

      await Promise.all(revoke.map((share) => revokeShareRequest(apiBase, share.slug)))
      await loadShares()
      notify.success('Доска снова приватная')
    } else {
      const share = await createShare(apiBase, { kind: 'board', refId: folder.boardId ?? undefined })
      const url = `${window.location.origin}${share.url}`

      await loadShares()
      await navigator.clipboard.writeText(url)
      notify.success('Ссылка скопирована', 'Доска опубликована')
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
const { scale, zoomIn, zoomOut, reset, setScale } = useBoardZoom()
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

const CARD_WIDTH = 200
const CARD_HEIGHT = 220
const COLUMN_GAP = 24
const COLUMNS = 4

/** Логический размер холста: растёт вместе с узлами, чтобы всё было доступно. */
const CANVAS_WIDTH = computed<number>(() => {
  const right = placed.value.reduce((max, node) => Math.max(max, node.x + node.width), 0)

  return Math.max(COLUMNS * (CARD_WIDTH + COLUMN_GAP) + COLUMN_GAP, right + COLUMN_GAP * 2)
})

const CANVAS_HEIGHT = computed<number>(() => {
  const bottom = placed.value.reduce(
    (max, node) => Math.max(max, node.y + (node.height ?? CARD_HEIGHT)),
    0,
  )

  return Math.max(1200, bottom + COLUMN_GAP * 2)
})

/** id выделенных узлов (карточек и файлов). */
const selectedIds = ref<string[]>([])

/**
 * Позиции перечитываем при каждом заходе на страницу: плагин грузит их на старте,
 * а после переходов (или сохранений с другого устройства) они могли измениться.
 */
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

  activate(next)

  if (queryFolder.value !== next) {
    void router.replace({ query: { ...route.query, folder: next } })
  }

  void initBoard(next)
})

// Переход между публичными ссылками (или выход из режима просмотра).
watch(shareSlug, (next) => {
  if (next) {
    void initShared(next)

    return
  }

  if (folderId.value) {
    void initBoard(folderId.value)
  }
})

const isEmpty = computed<boolean>(() => placed.value.length === 0)

/** Подсказка в шапке: меняется в зависимости от выделения. */
const hint = computed<string>(() =>
  selectedIds.value.length > 0
    ? `выбрано: ${selectedIds.value.length}`
    : 'перетащите карточку или выделите рамкой',
)
const percent = computed<number>(() => Math.round(scale.value * 100))

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

function handleSlider(event: Event): void {
  const target = event.target

  if (target instanceof HTMLInputElement) {
    setScale(Number(target.value) / 100)
  }
}

/** Клик по карточке: без Shift — только она, с Shift — добавить/убрать. */
function toggleCard(id: string, additive: boolean): void {
  if (additive) {
    selectedIds.value = selectedIds.value.includes(id)
      ? selectedIds.value.filter((selectedId) => selectedId !== id)
      : [...selectedIds.value, id]
    return
  }

  selectedIds.value =
    selectedIds.value.length === 1 && selectedIds.value[0] === id ? [] : [id]
}

// --- Перетаскивание узлов (карточек и файлов) ---

/** Ссылки на узлы: нужны, чтобы сдвигать группу и сохранять позиции. */
type NodeRef = { setPosition: (x: number, y: number) => void }
const nodeRefs = new Map<string, NodeRef>()

let dragOrigin: Map<string, { x: number; y: number }> | null = null

function setNodeRef(key: string, component: unknown): void {
  if (component) {
    nodeRefs.set(key, component as NodeRef)
  } else {
    nodeRefs.delete(key)
  }
}

function handleDragStart(key: string): void {
  if (!selectedIds.value.includes(key)) {
    selectedIds.value = [key]
  }

  dragOrigin = new Map(
    placed.value
      .filter((item) => selectedIds.value.includes(item.key))
      .map((item) => [item.key, { x: item.x, y: item.y }]),
  )
}

function handleDrag(key: string, dx: number, dy: number): void {
  if (!dragOrigin) {
    return
  }

  for (const [otherKey, origin] of dragOrigin) {
    if (otherKey === key) {
      continue
    }

    nodeRefs.get(otherKey)?.setPosition(origin.x + dx, origin.y + dy)
  }

  // Линии связи идут за блоками во время перетаскивания.
  tick.value++
}

/** По окончании переноса фиксируем позиции всех сдвинутых узлов в D1. */
function handleDragEnd(key: string, dx: number, dy: number): void {
  if (dragOrigin) {
    for (const [otherKey, origin] of dragOrigin) {
      moveNode(otherKey, Math.round(origin.x + dx), Math.round(origin.y + dy))
    }
  }

  dragOrigin = null
}

// --- Связи между карточками и файлами ---

/** Тик, который дёргаем после перетаскивания, чтобы пересчитать линии. */
const tick = ref<number>(0)

function positionOfKey(key: string): { x: number; y: number; width: number; height?: number } | undefined {
  const node = placed.value.find((item) => item.key === key)

  return node ? { x: node.x, y: node.y, width: node.width, height: node.height } : undefined
}

/**
 * Линии от правого края карточки к левому краю файла. Точки берём из DOM-рефов,
 * чтобы линия шла за блоком во время перетаскивания, а не только после него.
 */
const edges = computed(() => {
  void tick.value

  const fallbackHeight = CARD_HEIGHT

  return links.value.flatMap((link) => {
    const fromRef = nodeRefs.get(link.itemId)
    const toRef = nodeRefs.get(link.noteId)
    const fromBase = positionOfKey(link.itemId)
    const toBase = positionOfKey(link.noteId)

    if (!fromBase || !toBase) {
      return []
    }

    const from = (fromRef as unknown as { position?: () => { x: number; y: number; width: number; height: number } })?.position?.()
      ?? { ...fromBase, height: fromBase.height ?? fallbackHeight }
    const to = (toRef as unknown as { position?: () => { x: number; y: number; width: number; height: number } })?.position?.()
      ?? { ...toBase, height: toBase.height ?? 120 }

    const x1 = from.x + from.width
    const y1 = from.y + from.height / 2
    const x2 = to.x
    const y2 = to.y + to.height / 2
    const mid = (x1 + x2) / 2

    return [{
      key: `${link.itemId}:${link.noteId}`,
      d: `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`,
    }]
  })
})

// --- Рамка выделения на пустом месте холста ---

const canvasEl = ref<HTMLElement | null>(null)
const marquee = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const additiveSelect = ref<boolean>(false)

let marqueeStart: { x: number; y: number } | null = null
let baseSelection: string[] = []

function canvasScale(): number {
  return scale.value || 1
}

function startMarquee(event: PointerEvent): void {
  if (event.button !== 0 || !canvasEl.value) {
    return
  }

  const rect = canvasEl.value.getBoundingClientRect()
  const s = canvasScale()

  marqueeStart = {
    x: (event.clientX - rect.left) / s,
    y: (event.clientY - rect.top) / s,
  }
  additiveSelect.value = event.shiftKey
  baseSelection = [...selectedIds.value]
  marquee.value = { x: marqueeStart.x, y: marqueeStart.y, w: 0, h: 0 }

  window.addEventListener('pointermove', moveMarquee)
  window.addEventListener('pointerup', endMarquee)
}

function moveMarquee(event: PointerEvent): void {
  if (!marqueeStart || !canvasEl.value) {
    return
  }

  const rect = canvasEl.value.getBoundingClientRect()
  const s = canvasScale()
  const currentX = (event.clientX - rect.left) / s
  const currentY = (event.clientY - rect.top) / s

  const x = Math.min(marqueeStart.x, currentX)
  const y = Math.min(marqueeStart.y, currentY)
  const w = Math.abs(currentX - marqueeStart.x)
  const h = Math.abs(currentY - marqueeStart.y)

  marquee.value = { x, y, w, h }

  const hit = placed.value
    .filter(
      (item) =>
        item.x < x + w &&
        item.x + item.width > x &&
        item.y < y + h &&
        item.y + (item.height ?? CARD_HEIGHT) > y,
    )
    .map((item) => item.key)

  selectedIds.value = additiveSelect.value
    ? [...new Set([...baseSelection, ...hit])]
    : hit
}

function endMarquee(): void {
  window.removeEventListener('pointermove', moveMarquee)
  window.removeEventListener('pointerup', endMarquee)
  marqueeStart = null
  marquee.value = null

  // Клик по пустому месту без протяжки снимает выделение.
  if (!additiveSelect.value && selectedIds.value.length === 0) {
    selectedIds.value = []
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    selectedIds.value = []
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('pointermove', moveMarquee)
  window.removeEventListener('pointerup', endMarquee)
})
</script>

<template>
  <section
    class="flex min-h-0 w-full flex-1 flex-col"
    :class="fullView ? 'h-dvh bg-app' : ''"
  >
    <!-- Табы открытых досок: один таб = доска одной папки -->
    <div
      v-if="!shareSlug && tabs.length > 0"
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
          class="size-3 shrink-0 cursor-pointer text-mute opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink"
          role="button"
          tabindex="0"
          :aria-label="`Закрыть доску «${tab.name}»`"
          @click.stop="closeTab(tab.folderId)"
          @keydown.enter.prevent.stop="closeTab(tab.folderId)"
        />
      </div>
    </div>
    <!-- Шапка: подсказка стоит сразу за названием доски, зум — у правого края. -->
    <header
      class="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 sm:flex-nowrap sm:px-8"
    >
      <div class="flex min-w-0 shrink-0 flex-col gap-0.5">
        <h1 class="max-w-[220px] truncate text-base font-semibold text-ink sm:text-lg">{{ boardTitle }}</h1>

        <!-- Публичная доска: кружок с буквой и полный email автора -->
        <UTooltip
          v-if="shareSlug && sharedAuthor"
          :text="`Это доска пользователя «${sharedAuthor}»`"
          :delay-duration="150"
        >
          <div class="flex min-w-0 items-center gap-1.5">
            <span
              class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold uppercase leading-none text-white"
              aria-hidden="true"
            >
              {{ authorInitial }}
            </span>
            <span class="max-w-[240px] truncate text-xs text-mute">{{ sharedAuthor }}</span>
          </div>
        </UTooltip>
      </div>

      <span class="min-w-0 truncate text-xs text-mute">{{ hint }}</span>

      <!-- Публичная доска: открыть ту же доску без интерфейса приложения -->
      <UButton
        v-if="shareSlug && !fullView"
        :to="`/board?share=${shareSlug}&full=1`"
        target="_blank"
        rel="noopener noreferrer"
        color="neutral"
        variant="outline"
        size="xs"
        icon="i-lucide-maximize-2"
        label="Открыть полностью"
        class="rounded-lg"
      />

      <!-- Полноэкранный режим: вернуться на главную -->
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
        v-if="!shareSlug && isAuth && currentFolder"
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


      <div class="ml-auto flex shrink-0 items-center gap-1">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-minus"
          square
          aria-label="Уменьшить"
          @click="zoomOut"
        />
        <input
          :value="percent"
          type="range"
          min="40"
          max="200"
          step="10"
          aria-label="Масштаб доски"
          class="w-20 cursor-pointer accent-[var(--color-accent)] sm:w-28"
          @input="handleSlider"
        />
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-plus"
          square
          aria-label="Увеличить"
          @click="zoomIn"
        />
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="xs"
          :label="`${percent}%`"
          class="tabular-nums"
          title="Сбросить масштаб"
          @click="reset"
        />
      </div>
    </header>

    <div class="relative min-h-0 flex-1 overflow-auto bg-app">
      <!-- Нет ни одной открытой доски (вкладки закрыты) -->
      <EmptyState
        v-if="!shareSlug && tabs.length === 0"
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

      <!--
        Холст фиксированного логического размера: при увеличении зума
        появляется прокрутка, а не «сплющивание» карточек.
      -->
      <div
        v-else
        ref="canvasEl"
        class="relative origin-top-left transition-transform duration-150"
        :style="{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          transform: `scale(${scale})`,
        }"
        @pointerdown.self="startMarquee"
      >
        <!--
          Связи «карточка → файлы»: выводятся из данных (`notes.item_id`),
          поэтому отдельного графа нет. SVG лежит под узлами и не ловит клики.
          Позиции пересчитываются при перетаскивании (через `tick`).
        -->
        <svg
          class="pointer-events-none absolute inset-0 z-0"
          :width="CANVAS_WIDTH"
          :height="CANVAS_HEIGHT"
          aria-hidden="true"
        >
          <path
            v-for="edge in edges"
            :key="edge.key"
            :d="edge.d"
            fill="none"
            stroke="var(--color-line)"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>

        <div
          v-if="marquee"
          class="pointer-events-none absolute z-10 border border-accent bg-accent/10"
          :style="{
            left: `${marquee.x}px`,
            top: `${marquee.y}px`,
            width: `${marquee.w}px`,
            height: `${marquee.h}px`,
          }"
        />

        <!-- Карточки -->
        <template v-for="item in placed" :key="`${item.kind}-${item.key}`">
          <DraggableCardWrapper
            v-if="item.kind === 'card'"
            :ref="(component) => setNodeRef(item.key, component)"
            :card="item.card"
            :start-x="item.x"
            :start-y="item.y"
            :width="item.width"
            :selected="selectedIds.includes(item.key)"
            @pick="toggleCard"
            @drag-start="handleDragStart"
            @drag="handleDrag"
            @drag-end="handleDragEnd"
          />

          <!-- Файлы (заметки): фиксированный блок со скроллом внутри -->
          <DraggableFileNode
            v-else
            :ref="(component) => setNodeRef(item.key, component)"
            :note="item.note"
            :start-x="item.x"
            :start-y="item.y"
            :width="item.width"
            :height="item.height"
            :selected="selectedIds.includes(item.key)"
            @pick="toggleCard"
            @drag-start="handleDragStart"
            @drag="handleDrag"
            @drag-end="handleDragEnd"
          />
        </template>
      </div>
    </div>

    <!-- Кнопка суммаризации выделенных (в публичной доске не нужна) -->
    <div
      v-if="!shareSlug && selectedIds.length > 0"
      class="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center"
    >
      <!-- Без входа кнопка недоступна: показываем подсказку со входом -->
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

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Card } from '~/types/card'
import type { Note } from '~/api/notes'

/**
 * Доска: карточки и файлы (заметки) — перетаскиваемые узлы с общим зумом
 * и выделением. Позиции узлов сохраняются в D1 (`/api/board`), масштаб
 * остаётся сессионным. Связи «карточка ↔ файлы» выводятся из `notes.item_id`.
 */
const { cards } = useCards()
const { placed, links, init: initBoard, moveNode } = useBoard()
const { notes } = useFiles()
const { scale, zoomIn, zoomOut, reset, setScale } = useBoardZoom()
const { openModal: openSummarize } = useSummarizeModal()

/** Саммари требует доступ к ИИ (свой ключ или премиум) и вход в аккаунт. */
const { canUseAi } = useAiKey()
const { openModal: openKeyModal } = useAiKeyModal()
const { openModal: openAuthModal } = useAuthModal()
const { isAuth } = useAuth()

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
  void initBoard()
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
  <section class="flex min-h-0 w-full flex-1 flex-col">
    <!--
      Шапка: на мобильном hint уходит отдельной строкой под зум-контролы,
      на десктопе всё в одну строку.
    -->
    <header
      class="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 sm:flex-nowrap sm:px-8"
    >
      <h1 class="shrink-0 text-base font-semibold text-ink sm:text-lg">Доска</h1>

      <span class="order-last w-full min-w-0 truncate text-xs text-mute sm:order-none sm:w-auto">
        {{ hint }}
      </span>

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
      <AuthGate
        v-if="!isAuth"
        feature="Доска"
        description="Раскладывать карточки и файлы по холсту можно после входа в аккаунт."
        class="mt-10"
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

    <!-- Кнопка суммаризации выделенных -->
    <div
      v-if="selectedIds.length > 0"
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

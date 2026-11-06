<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Card } from '~/types/card'

/**
 * Доска со свободно перетаскиваемыми карточками, общим зумом и выделением.
 * Позиции и масштаб хранятся только в памяти страницы (сессионно).
 */
const { cards, init } = useCards()
const { scale, zoomIn, zoomOut, reset, setScale } = useBoardZoom()
const { openModal: openSummarize } = useSummarizeModal()

/** Саммари доступно только после входа. */
const { isAuth } = useAuth()

interface PlacedCard {
  card: Card
  x: number
  y: number
}

const CARD_WIDTH = 200
const COLUMN_GAP = 24
const ROW_GAP = 24
const COLUMNS = 4
const CARD_HEIGHT = 220

/** Логический размер холста в px до масштабирования. */
const CANVAS_WIDTH = COLUMNS * (CARD_WIDTH + COLUMN_GAP) + COLUMN_GAP
const CANVAS_HEIGHT = 1600

/** Стартовая раскладка «плиткой», чтобы карточки не лежали друг на друге. */
const placed = ref<PlacedCard[]>([])

/** id выделенных карточек. */
const selectedIds = ref<string[]>([])

function layoutCards(list: readonly Card[]): void {
  placed.value = list.map((card, index) => ({
    card,
    x: (index % COLUMNS) * (CARD_WIDTH + COLUMN_GAP) + COLUMN_GAP,
    y: Math.floor(index / COLUMNS) * (CARD_ROW_PITCH) + COLUMN_GAP,
  }))
}

/** Шаг по вертикали: чуть больше карточки, чтобы было где выделять пустотой. */
const CARD_ROW_PITCH = CARD_HEIGHT + ROW_GAP

const { init: initFiles } = useFiles()

onMounted(() => {
  // Папки и заметки — отдельная загрузка; без неё дерево пустое после перезагрузки.
  initFiles()
  init()
  layoutCards(cards.value)
})

const isEmpty = computed<boolean>(() => placed.value.length === 0)

/** Подсказка в шапке: меняется в зависимости от выделения. */
const hint = computed<string>(() =>
  selectedIds.value.length > 0
    ? `выбрано: ${selectedIds.value.length}`
    : 'перетащите карточку или выделите рамкой',
)
const percent = computed<number>(() => Math.round(scale.value * 100))

const selectedCards = computed<Card[]>(() =>
  placed.value
    .filter((item) => selectedIds.value.includes(item.card.id))
    .map((item) => item.card),
)

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

// --- Групповое перетаскивание ---

let dragOrigin: Map<string, { x: number; y: number }> | null = null

function handleDragStart(id: string): void {
  if (!selectedIds.value.includes(id)) {
    selectedIds.value = [id]
  }

  dragOrigin = new Map(
    placed.value
      .filter((item) => selectedIds.value.includes(item.card.id))
      .map((item) => [item.card.id, { x: item.x, y: item.y }]),
  )
}

function handleDrag(id: string, dx: number, dy: number): void {
  if (!dragOrigin) {
    return
  }

  placed.value = placed.value.map((item) => {
    const origin = dragOrigin?.get(item.card.id)

    if (!origin) {
      return item
    }

    return { ...item, x: origin.x + dx, y: origin.y + dy }
  })

  // Синхронизируем локальную позицию лидера (её меняет сам компонент).
  void id
}

function handleDragEnd(): void {
  dragOrigin = null
}

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
        item.x + CARD_WIDTH > x &&
        item.y < y + h &&
        item.y + CARD_HEIGHT > y,
    )
    .map((item) => item.card.id)

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
      <EmptyState
        v-if="isEmpty"
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

        <DraggableCardWrapper
          v-for="item in placed"
          :key="item.card.id"
          :card="item.card"
          :start-x="item.x"
          :start-y="item.y"
          :width="CARD_WIDTH"
          :selected="selectedIds.includes(item.card.id)"
          @pick="toggleCard"
          @drag-start="handleDragStart"
          @drag="handleDrag"
          @drag-end="handleDragEnd"
        />
      </div>
    </div>

    <!-- Кнопка суммаризации выделенных -->
    <div
      v-if="selectedIds.length > 0"
      class="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center"
    >
      <!-- Без входа кнопка недоступна: показываем подсказку со входом -->
      <AuthRequiredPopover v-if="!isAuth" feature="Суммировать ИИ">
        <UButton
          type="button"
          color="neutral"
          variant="solid"
          size="md"
          icon="i-lucide-lock"
          :label="`Суммировать ИИ · ${selectedIds.length}`"
          class="pointer-events-auto cursor-not-allowed rounded-full px-5 shadow-lg opacity-60"
          aria-disabled="true"
          @click.stop
        />
      </AuthRequiredPopover>

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

    <AppSummarizeModal :cards="selectedCards" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Note } from '~/api/notes'

/**
 * Перетаскиваемый файл-блок доски: фиксированная белая панель, внутри
 * заголовок и прокручиваемый контент заметки. Тянется за шапку, поэтому
 * прокрутка контента и выделение текста не конфликтуют с перетаскиванием.
 */
const props = defineProps<{
  note: Note
  startX: number
  startY: number
  width: number
  height: number
  selected?: boolean
}>()

const emit = defineEmits<{
  /** Клик по шапке: выделение узла. */
  pick: [id: string, additive: boolean]
  dragStart: [id: string]
  drag: [id: string, dx: number, dy: number]
  dragEnd: [id: string, dx: number, dy: number]
}>()

const el = ref<HTMLElement | null>(null)
const x = ref<number>(props.startX)
const y = ref<number>(props.startY)
const isDragging = ref<boolean>(false)

let pointerStart: { x: number; y: number } | null = null
let originStart: { x: number; y: number } | null = null
let dragged = false

/** Масштаб холста (делим дельту, чтобы блок не «убегал» при зуме). */
function readScale(): number {
  const canvas = el.value?.parentElement

  if (!canvas) {
    return 1
  }

  const transform = getComputedStyle(canvas).transform

  if (!transform || transform === 'none') {
    return 1
  }

  return new DOMMatrixReadOnly(transform).a || 1
}

function handleMove(event: PointerEvent): void {
  if (!pointerStart || !originStart) {
    return
  }

  const scale = readScale() || 1
  const dx = (event.clientX - pointerStart.x) / scale
  const dy = (event.clientY - pointerStart.y) / scale

  if (!dragged && Math.abs(dx) + Math.abs(dy) < 3) {
    return
  }

  dragged = true
  x.value = originStart.x + dx
  y.value = originStart.y + dy
  emit('drag', props.note.id, dx, dy)
}

function handleUp(): void {
  window.removeEventListener('pointermove', handleMove)
  window.removeEventListener('pointerup', handleUp)
  window.removeEventListener('pointercancel', handleUp)

  if (!dragged) {
    emit('pick', props.note.id, false)
  }

  if (dragged && originStart) {
    emit('dragEnd', props.note.id, x.value - originStart.x, y.value - originStart.y)
  }

  pointerStart = null
  originStart = null
  isDragging.value = false
  dragged = false
}

function handleDown(event: PointerEvent): void {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  pointerStart = { x: event.clientX, y: event.clientY }
  originStart = { x: x.value, y: y.value }
  isDragging.value = true
  dragged = false
  emit('dragStart', props.note.id)

  window.addEventListener('pointermove', handleMove)
  window.addEventListener('pointerup', handleUp)
  window.addEventListener('pointercancel', handleUp)
}

/** Внешний сдвиг (когда тянут группу). */
function setPosition(nextX: number, nextY: number): void {
  x.value = nextX
  y.value = nextY
}

/** Позиция узла в логических координатах — для линий связи. */
function position(): { x: number; y: number; width: number; height: number } {
  return {
    x: x.value,
    y: y.value,
    width: props.width,
    height: props.height,
  }
}

defineExpose({ setPosition, position })

const isPlainText = computed<boolean>(() => !props.note.content.includes('\n\n#'))

function openNote(): void {
  void navigateTo(`/note/${props.note.id}`)
}
</script>

<template>
  <div
    ref="el"
    class="absolute touch-none select-none"
    :class="isDragging ? 'z-20' : 'z-0'"
    :style="{
      width: `${width}px`,
      height: `${height}px`,
      left: `${x}px`,
      top: `${y}px`,
    }"
  >
    <div
      class="flex h-full flex-col overflow-hidden rounded-2xl border bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
      :class="selected ? 'border-accent ring-2 ring-accent/30' : 'border-line'"
    >
      <!-- Шапка блока: за неё тянем, по ней же выделяем -->
      <div
        class="flex shrink-0 cursor-grab items-center gap-1 border-b border-line px-3 py-2"
        :class="isDragging ? 'cursor-grabbing' : undefined"
        @pointerdown="handleDown"
      >
        <UIcon name="i-lucide-file-text" class="size-4 shrink-0 text-mute" />
        <span class="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink" :title="note.title">
          {{ note.title }}
        </span>
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-arrow-up-right"
          square
          :aria-label="`Открыть заметку «${note.title}»`"
          @pointerdown.stop
          @click.stop="openNote"
        />
      </div>

      <!-- Контент заметки: прокручивается внутри фиксированного блока -->
      <div
        class="min-h-0 flex-1 overflow-y-auto px-3 py-2"
        @pointerdown.stop
        @wheel.stop
      >
        <p
          class="whitespace-pre-line text-[12px] leading-snug text-dim"
          :class="isPlainText ? '' : 'font-mono'"
        >
          {{ note.content }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Card } from '~/types/card'

/**
 * Перетаскиваемая карточка доски с поддержкой выделения.
 *
 * Позиционирование полностью своё (не `useDraggable`): тот считает позицию
 * от `getBoundingClientRect()` в экранных px и пишет её в `left/top`, из-за чего
 * на масштабированном холсте карточка «отлетала» при старте. Здесь берём сырые
 * pointer-события и делим дельту на масштаб.
 */
const props = defineProps<{
  card: Card
  startX: number
  startY: number
  width: number
  selected?: boolean
}>()

const emit = defineEmits<{
  /** Клик по карточке: выделение / снятие (с учётом Shift решает родитель). */
  pick: [id: string, additive: boolean]
  /** Карточку начали тянуть (родитель тянет всю группу выделенных). */
  dragStart: [id: string]
  /** Смещение в логических px доски. */
  drag: [id: string, dx: number, dy: number]
  /** Конец переноса: смещение в логических px, чтобы родитель сохранил позиции. */
  dragEnd: [id: string, dx: number, dy: number]
}>()

const el = ref<HTMLElement | null>(null)
const x = ref<number>(props.startX)
const y = ref<number>(props.startY)
const isDragging = ref<boolean>(false)

let pointerStart: { x: number; y: number } | null = null
let originStart: { x: number; y: number } | null = null
let dragged = false

/** Масштаб ближайшего трансформированного контейнера (холста доски). */
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
  emit('drag', props.card.id, dx, dy)
}

function handleUp(): void {
  window.removeEventListener('pointermove', handleMove)
  window.removeEventListener('pointerup', handleUp)
  window.removeEventListener('pointercancel', handleUp)

  if (!dragged) {
    emit('pick', props.card.id, false)
  }

  if (dragged && originStart) {
    emit('dragEnd', props.card.id, x.value - originStart.x, y.value - originStart.y)
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
  emit('dragStart', props.card.id)

  window.addEventListener('pointermove', handleMove)
  window.addEventListener('pointerup', handleUp)
  window.addEventListener('pointercancel', handleUp)
}

/** Внешний сдвиг (когда тянут другую карточку группы). */
function setPosition(nextX: number, nextY: number): void {
  x.value = nextX
  y.value = nextY
}

defineExpose({ setPosition })
</script>

<template>
  <div
    ref="el"
    class="absolute touch-none select-none"
    :class="isDragging ? 'z-20 cursor-grabbing' : 'z-0 cursor-grab'"
    :style="{
      width: `${width}px`,
      left: `${x}px`,
      top: `${y}px`,
    }"
    @pointerdown="handleDown"
  >
    <DraggableCard :card="card" :dragging="isDragging" :selected="selected" />
  </div>
</template>

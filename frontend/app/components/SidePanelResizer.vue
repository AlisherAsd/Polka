<script setup lang="ts">
/**
 * Разделитель для перетаскивания ширины второй панели.
 *
 * Тянем мышью/пальцем по горизонтали: ширина ограничивается
 * `MIN_WIDTH…MAX_WIDTH` и сохраняется в localStorage (см. `useSidePanel`).
 */
const props = withDefaults(
  defineProps<{
    /** Текущая ширина панели; для расчёта — от неё считаем дельту. */
    width: number
  }>(),
  { width: 224 },
)

const emit = defineEmits<{
  resize: [width: number]
  /** Тянуть начали/закончили — на это время отключаем CSS-переход ширины. */
  active: [isActive: boolean]
}>()

const { MIN_WIDTH, MAX_WIDTH } = useSidePanel()

const dragging = ref<boolean>(false)
let startX = 0
let startWidth = 0

function handleDown(event: PointerEvent): void {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  startX = event.clientX
  startWidth = props.width
  dragging.value = true
  emit('active', true)

  window.addEventListener('pointermove', handleMove)
  window.addEventListener('pointerup', handleUp)
  window.addEventListener('pointercancel', handleUp)
}

function handleMove(event: PointerEvent): void {
  if (!dragging.value) {
    return
  }

  const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + event.clientX - startX))

  emit('resize', Math.round(next))
}

function handleUp(): void {
  dragging.value = false
  emit('active', false)

  window.removeEventListener('pointermove', handleMove)
  window.removeEventListener('pointerup', handleUp)
  window.removeEventListener('pointercancel', handleUp)
}

onBeforeUnmount(handleUp)

/** Двойной клик — вернуть ширину по умолчанию. */
function handleDoubleClick(): void {
  emit('resize', 224)
}
</script>

<template>
  <div
    class="group relative z-20 hidden w-1 shrink-0 cursor-col-resize touch-none select-none bg-line/60 transition-colors hover:bg-primary/40 sm:block"
    :class="dragging ? 'bg-primary/60' : undefined"
    role="separator"
    aria-orientation="vertical"
    :aria-valuemin="MIN_WIDTH"
    :aria-valuemax="MAX_WIDTH"
    :aria-valuenow="width"
    title="Потяните, чтобы изменить ширину панели (двойной клик — сброс)"
    @pointerdown="handleDown"
    @dblclick="handleDoubleClick"
  >
    <!-- Широкая зона захвата поверх тонкой линии -->
    <span class="absolute inset-y-0 -left-1.5 -right-1.5" aria-hidden="true" />
  </div>
</template>

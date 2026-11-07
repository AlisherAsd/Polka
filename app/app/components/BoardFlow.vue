<script setup lang="ts">
import { computed, nextTick, watch } from 'vue'
import {
  Handle,
  Position,
  VueFlow,
  useVueFlow,
  type Edge,
  type Node,
  type NodeDragEvent,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'
import type { PlacedNode } from '~/composables/useBoard'
import type { Card } from '~/types/card'
import type { Note } from '~/api/notes'

/**
 * Холст доски на Vue Flow: бесконечное поле, пан/зум, миникарта,
 * выделение и перетаскивание узлов — всё даёт библиотека.
 *
 * Узлы — карточки и файлы; связи строятся из `notes.item_id`
 * (карточка → её файлы), поэтому отдельных рёбер в базе нет.
 */
const props = withDefaults(defineProps<{
  nodes: PlacedNode[]
  links: readonly { itemId: string; noteId: string }[]
  /** Публичная доска: смотреть можно, двигать нельзя. */
  readonly?: boolean
}>(), { readonly: false })

const emit = defineEmits<{
  /** Узел перетащили: новые координаты в логических px. */
  move: [key: string, x: number, y: number]
  /** Изменилось выделение (id карточек/заметок). */
  select: [keys: string[]]
}>()

const flow = useVueFlow()

/** Высота карточки по умолчанию (файлы приходят со своей). */
const CARD_HEIGHT = 220

interface CardNodeData {
  card: Card
}

interface FileNodeData {
  note: Note
}

const flowNodes = computed<Node<CardNodeData | FileNodeData>[]>(() =>
  props.nodes.map((node) => ({
    id: node.key,
    type: node.kind === 'card' ? 'card' : 'file',
    position: { x: node.x, y: node.y },
    data: node.kind === 'card' ? { card: node.card } : { note: node.note },
    style: {
      width: `${node.width}px`,
      height: `${node.height ?? CARD_HEIGHT}px`,
    },
    draggable: !props.readonly,
  })),
)

const flowEdges = computed<Edge[]>(() => {
  const ids = new Set(props.nodes.map((node) => node.key))

  return props.links
    .filter((link) => ids.has(link.itemId) && ids.has(link.noteId))
    .map((link) => ({
      id: `${link.itemId}-${link.noteId}`,
      source: link.itemId,
      target: link.noteId,
      type: 'smoothstep',
      style: { stroke: 'var(--color-line)', strokeWidth: 2 },
    }))
})

flow.onNodeDragStop((event: NodeDragEvent) => {
  if (props.readonly) {
    return
  }

  // Vue Flow двигает всю группу выделенных — сохраняем каждую позицию.
  const nodes = event.nodes.length > 0 ? event.nodes : [event.node]

  for (const node of nodes) {
    emit('move', node.id, Math.round(node.position.x), Math.round(node.position.y))
  }
})

/** Выделение меняется через `nodesChange`; читаем его после применения. */
flow.onNodesChange((changes) => {
  if (!changes.some((change) => change.type === 'select')) {
    return
  }

  void nextTick(() => emit('select', flow.getSelectedNodes.value.map((node) => node.id)))
})

flow.onPaneClick(() => emit('select', []))

// Новая папка/публичная доска — вписываем содержимое в экран.
watch(
  () => props.nodes.map((node) => node.key).join('|'),
  () => {
    if (props.nodes.length === 0) {
      return
    }

    void nextTick(() => {
      window.setTimeout(() => void flow.fitView({ padding: 0.2, duration: 300 }), 60)
    })
  },
  { immediate: true },
)
</script>

<template>
  <VueFlow
    class="board-flow h-full w-full"
    :nodes="flowNodes"
    :edges="flowEdges"
    :nodes-draggable="!readonly"
    :nodes-connectable="false"
    :elements-selectable="true"
    :zoom-on-scroll="true"
    :zoom-on-pinch="true"
    :pan-on-drag="true"
    :min-zoom="0.2"
    :max-zoom="2.5"
    :delete-key-code="null"
  >
    <Background :gap="28" :size="1.5" pattern-color="var(--color-line)" />

    <Controls position="bottom-right" :show-interactive="false" />

    <MiniMap
      v-if="nodes.length > 0"
      position="bottom-left"
      pannable
      zoomable
      class="hidden sm:block"
    />

    <template #node-card="{ data, selected }">
      <div class="relative h-full w-full">
        <DraggableCard :card="(data as CardNodeData).card" :selected="selected" />

        <!-- Точка, из которой идёт линия к файлу -->
        <Handle type="source" :position="Position.Right" class="board-flow__handle" />
      </div>
    </template>

    <template #node-file="{ data, selected }">
      <div class="relative h-full w-full">
        <BoardFileNode
          :note="(data as FileNodeData).note"
          :selected="selected"
          :readonly="readonly"
        />

        <Handle type="target" :position="Position.Left" class="board-flow__handle" />
      </div>
    </template>
  </VueFlow>
</template>

<style>
/* Оформление узлов — наше: убираем рамку/фон/паддинги темы Vue Flow. */
.board-flow .vue-flow__node {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  font-size: inherit;
}

.board-flow .vue-flow__node.selected {
  box-shadow: none;
}

/* Точки связи не должны ловить мышь или быть видны. */
.board-flow .board-flow__handle {
  width: 1px;
  height: 1px;
  min-width: 0;
  min-height: 0;
  border: 0;
  background: transparent;
  opacity: 0;
  pointer-events: none;
}

.board-flow .vue-flow__edge-path {
  stroke: var(--color-line);
}

/* Контролы и миникарта в стиле приложения. */
.board-flow .vue-flow__controls {
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: var(--color-surface);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.board-flow .vue-flow__controls-button {
  border-bottom-color: var(--color-line);
  background: var(--color-surface);
  fill: var(--color-ink);
}

.board-flow .vue-flow__minimap {
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: var(--color-surface);
}
</style>

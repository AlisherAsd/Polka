<script setup lang="ts">
import { computed } from 'vue'
import type { Note } from '~/api/notes'

/**
 * Файл-заметка на доске Vue Flow: заголовок и прокручиваемый контент.
 * Двигать узел будет сама библиотека, поэтому своих pointer-обработчиков нет.
 */
const props = defineProps<{
  note: Note
  selected?: boolean
  readonly?: boolean
}>()

const isPlainText = computed<boolean>(() => !props.note.content.includes('\n\n#'))

function openNote(): void {
  if (props.readonly) {
    return
  }

  void navigateTo(`/note/${props.note.id}`)
}
</script>

<template>
  <div
    class="flex h-full flex-col overflow-hidden rounded-2xl border bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
    :class="selected ? 'border-accent ring-2 ring-accent/30' : 'border-line'"
  >
    <div class="flex shrink-0 items-center gap-1 border-b border-line px-3 py-2">
      <UIcon name="i-lucide-file-text" class="size-4 shrink-0 text-mute" />
      <span class="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink" :title="note.title">
        {{ note.title }}
      </span>
      <UButton
        v-if="!readonly"
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

    <!-- `nowheel`/`nodrag` — чтобы прокрутка и выделение текста не двигали доску -->
    <div class="nodrag nowheel min-h-0 flex-1 overflow-y-auto px-3 py-2">
      <p
        class="whitespace-pre-line text-[12px] leading-snug text-dim"
        :class="isPlainText ? '' : 'font-mono'"
      >
        {{ note.content }}
      </p>
    </div>
  </div>
</template>

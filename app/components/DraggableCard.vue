<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Card, CardType } from '~/types/card'

/**
 * Карточка для доски: только содержимое, без действий (в отличие от CardItem
 * нет чекбокса, крестика и ссылки в заголовке).
 */
const props = defineProps<{
  card: Card
  /** Карточка сейчас перетаскивается. */
  dragging?: boolean
  /** Карточка выделена. */
  selected?: boolean
}>()

const TYPE_ICON: Readonly<Record<CardType, string>> = {
  youtube: '▶',
  tiktok: '♪',
  telegram: '✈',
  article: '◫',
}

const typeIcon = computed<string>(() => TYPE_ICON[props.card.type])

const thumbnailFailed = ref(false)

watch(
  () => props.card.thumbnailUrl,
  () => {
    thumbnailFailed.value = false
  },
)

const showThumbnail = computed<boolean>(
  () => Boolean(props.card.thumbnailUrl) && !thumbnailFailed.value,
)

const formattedDate = computed<string>(() => {
  const date = new Date(props.card.createdAt)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
})
</script>

<template>
  <article
    class="flex h-full cursor-grab select-none flex-col overflow-hidden rounded-2xl border bg-surface"
    :class="
      selected
        ? 'border-accent ring-2 ring-accent/30'
        : dragging
          ? 'border-accent shadow-lg'
          : 'border-line shadow-sm'
    "
  >
    <div class="pointer-events-none relative aspect-video w-full overflow-hidden bg-[#ededed]">
      <img
        v-if="showThumbnail"
        :src="card.thumbnailUrl"
        :alt="card.title"
        draggable="false"
        loading="lazy"
        class="h-full w-full object-cover"
        @error="thumbnailFailed = true"
      />
      <div
        v-else
        class="flex h-full w-full flex-col items-center justify-center gap-1 text-mute"
      >
        <span class="text-2xl leading-none">{{ typeIcon }}</span>
        <span class="text-xs">Нет превью</span>
      </div>
    </div>

    <div class="flex flex-1 flex-col gap-1 p-2">
      <p class="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">
        {{ card.title }}
      </p>

      <p
        v-if="card.description"
        class="line-clamp-1 text-[11px] leading-snug text-dim"
      >
        {{ card.description }}
      </p>

      <div v-if="card.tags?.length" class="flex flex-wrap gap-1">
        <UBadge
          v-for="tag in card.tags"
          :key="tag"
          color="primary"
          variant="subtle"
          size="xs"
          :label="tag"
        />
      </div>

      <div class="mt-auto flex items-center justify-between gap-2 pt-0.5 text-[11px] text-mute">
        <span class="truncate">{{ card.authorName ?? card.type }}</span>
        <span class="shrink-0">{{ formattedDate }}</span>
      </div>
    </div>
  </article>
</template>

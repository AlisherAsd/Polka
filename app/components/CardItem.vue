<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Card, CardType } from '~/types/card'

const props = defineProps<{
  card: Card
  selected?: boolean
}>()

const emit = defineEmits<{
  delete: [id: string]
  toggle: [id: string]
}>()

/** Иконка-заглушка превью по типу источника. */
const TYPE_ICON: Readonly<Record<CardType, string>> = {
  youtube: '▶',
  tiktok: '♪',
  telegram: '✈',
  article: '◫',
}

const typeIcon = computed<string>(() => TYPE_ICON[props.card.type])

/** Ошибка загрузки превью (битый URL, hotlink-защита) — показываем заглушку. */
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

/** Домен источника — вторая строка под заголовком. */
const host = computed<string>(() => {
  try {
    return new URL(props.card.url).hostname.replace(/^www\./, '')
  } catch {
    return props.card.url
  }
})

const formattedDate = computed<string>(() => {
  const date = new Date(props.card.createdAt)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
})

function handleDelete(): void {
  emit('delete', props.card.id)
}

function handleToggle(): void {
  emit('toggle', props.card.id)
}
</script>

<template>
  <article
    class="group flex h-full flex-col overflow-hidden rounded-2xl border bg-surface transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
    :class="selected ? 'border-accent ring-2 ring-accent/30' : 'border-line'"
  >
    <div class="relative aspect-video w-full overflow-hidden bg-[#ededed]">
      <!-- Чекбокс выделения: виден всегда, клик не переходит по ссылке -->
      <div
        class="absolute left-2 top-2 z-10 rounded-md bg-white/90 p-0.5 shadow-sm backdrop-blur-sm"
        @click.stop
      >
        <UCheckbox
          :model-value="Boolean(selected)"
          color="primary"
          :aria-label="`Выбрать «${card.title}»`"
          @update:model-value="handleToggle"
        />
      </div>

      <img
        v-if="showThumbnail"
        :src="card.thumbnailUrl"
        :alt="card.title"
        loading="lazy"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        @error="thumbnailFailed = true"
      />
      <div
        v-else
        class="flex h-full w-full flex-col items-center justify-center gap-1 text-mute"
      >
        <span class="text-2xl leading-none">{{ typeIcon }}</span>
        <span class="text-xs">Нет превью</span>
      </div>

      <UButton
        type="button"
        color="neutral"
        variant="solid"
        size="xs"
        icon="i-lucide-x"
        square
        class="absolute right-2 top-2 rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100"
        :aria-label="`Удалить «${card.title}»`"
        @click="handleDelete"
      />
    </div>

    <div class="flex flex-1 flex-col gap-1 p-2">
      <a
        :href="card.url"
        target="_blank"
        rel="noopener noreferrer"
        class="line-clamp-2 text-[13px] font-semibold leading-snug text-ink hover:underline"
        :title="card.title"
      >
        {{ card.title }}
      </a>

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
        <span class="truncate" :title="card.authorName ?? host">
          {{ card.authorName ?? host }}
        </span>
        <span class="shrink-0">{{ formattedDate }}</span>
      </div>
    </div>
  </article>
</template>

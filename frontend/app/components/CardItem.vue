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

/** Саммари — только для авторизованных, как и на доске. */
const { isAuth } = useAuth()
const { openModal: openAuthModal } = useAuthModal()

/** Поповер «Суммировать»: открыт максимум у одной карточки, сетку не двигает. */
const { isOpen, close: closePopover, summaryOf, openWithSummary } = useCardPopover()

/** Состояние саммари именно этой карточки. */
const summaryState = computed(() => summaryOf(props.card.id))

/** Кнопка/блок карточки запускают запрос саммари (повторно — без запроса). */
function handleSummarize(): void {
  if (!isAuth.value) {
    openAuthModal()

    return
  }

  void openWithSummary(props.card)
}

const popoverOpen = computed<boolean>({
  get: () => isOpen(props.card.id),
  set: (value: boolean) => {
    if (!value && isOpen(props.card.id)) {
      closePopover()
    }
  },
})

/** Иконка-заглушка превью по типу источника. */
const TYPE_ICON: Readonly<Record<CardType, string>> = {
  youtube: '▶',
  tiktok: '♪',
  article: '◫',
  note: '✎',
}

const typeIcon = computed<string>(() => TYPE_ICON[props.card.type])

/** Ошибка загрузки превью (битый URL, hotlink-защита) — показываем заглушку. */
const thumbnailFailed = ref(false)

watch(
  () => props.card.thumbnail,
  () => {
    thumbnailFailed.value = false
  },
)

const showThumbnail = computed<boolean>(
  () => Boolean(props.card.thumbnail) && !thumbnailFailed.value,
)

/** Домен источника — вторая строка под заголовком (у заметок — «Заметка»). */
const host = computed<string>(() => {
  if (!props.card.url) {
    return 'Заметка'
  }

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
  <!--
    Пока панель саммари открыта, у карточки нет нижнего скругления и тени:
    карточка и панель читаются как один блок.
  -->
  <article
    class="group flex h-full flex-col overflow-hidden border bg-surface transition-shadow"
    :class="[
      selected ? 'border-accent ring-2 ring-accent/30' : 'border-line',
      popoverOpen
        ? 'rounded-t-2xl rounded-b-none shadow-none'
        : 'rounded-2xl hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]',
    ]"
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
        :src="card.thumbnail"
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

      <!-- «Суммировать»: открывает панель под картинкой вместо блока описания -->
      <UButton
        type="button"
        color="neutral"
        variant="solid"
        size="xs"
        icon="i-lucide-sparkles"
        label="Суммировать"
        class="absolute bottom-2 left-2 rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100"
        :aria-label="`Суммировать «${card.title}»`"
        @click.stop="handleSummarize"
      />

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

    <!--
      Подложка поповера: панель начинается ровно под картинкой (align start +
      offset 0), непрозрачная, повторяет ширину и форму карточки и растягивается
      вниз настолько, насколько нужно её содержимому. На сетку не влияет —
      портал reka-ui рисует её поверх потока.
    -->
    <UPopover
      v-model:open="popoverOpen"
      :content="{
        side: 'bottom',
        align: 'start',
        sideOffset: 0,
        sideFlip: false,
        alignFlip: false,
        collisionPadding: 0,
        alignOffset: -1,
      }"
      :ui="{ content: 'card-popover' }"
    >
      <!-- Триггер — сам информационный блок: панель «заменяет» его содержимое. -->
      <div
        class="relative flex flex-1 cursor-pointer flex-col gap-1 p-2"
        role="button"
        tabindex="0"
        :aria-expanded="popoverOpen"
        :aria-label="`Показать саммари «${card.title}»`"
        @click="handleSummarize"
        @keydown.enter.prevent="handleSummarize"
      >
        <a
          :href="card.url"
          target="_blank"
          rel="noopener noreferrer"
          class="line-clamp-2 text-[13px] font-semibold leading-snug text-ink hover:underline"
          :title="card.title"
          @click.stop
        >
          {{ card.title }}
        </a>

        <p
          v-if="card.summary"
          class="line-clamp-1 text-[11px] leading-snug text-dim"
        >
          {{ card.summary }}
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
          <span class="truncate" :title="host">{{ host }}</span>
          <span class="shrink-0">{{ formattedDate }}</span>
        </div>
      </div>

      <template #content>
        <div class="flex flex-col gap-2">
          <p class="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">
            {{ card.title }}
          </p>

          <!-- Заглушка, пока идёт запрос саммари -->
          <div
            v-if="summaryState.status === 'loading'"
            class="flex flex-col gap-1.5"
            role="status"
            aria-live="polite"
          >
            <span class="sr-only">Собираем саммари…</span>
            <div class="h-2.5 w-full animate-pulse rounded bg-[#ededed]" />
            <div class="h-2.5 w-11/12 animate-pulse rounded bg-[#ededed]" />
            <div class="h-2.5 w-8/12 animate-pulse rounded bg-[#ededed]" />
          </div>

          <!-- Ошибка запроса -->
          <p
            v-else-if="summaryState.status === 'error'"
            class="text-[11px] leading-snug text-[#b3261e]"
          >
            {{ summaryState.text }}
          </p>

          <!-- Готовый текст саммари: прокручивается, если длинный -->
          <p
            v-else-if="summaryState.status === 'ready'"
            class="max-h-48 overflow-y-auto whitespace-pre-line text-[11px] leading-snug text-dim"
          >
            {{ summaryState.text }}
          </p>

          <p v-else class="text-[11px] leading-snug text-dim">
            Нажмите «Суммировать», чтобы получить краткое содержание.
          </p>
          <div class="mt-auto flex items-center justify-end pt-0.5">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              size="xs"
              icon="i-lucide-x"
              label="Закрыть"
              class="rounded-lg px-2.5 text-[11px]"
              @click.stop="closePopover"
            />
          </div>
        </div>
      </template>
    </UPopover>
  </article>
</template>

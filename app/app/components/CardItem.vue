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

/** Саммари требует доступ к ИИ: свой ключ или премиум (и вход в аккаунт). */
const { canUseAi } = useAiKey()
const { openModal: openKeyModal } = useAiKeyModal()
const { openModal: openAuthModal } = useAuthModal()
const { isAuth } = useAuth()
const { folders, addNote } = useFiles()
const notify = useNotify()

/** Поповер «Суммировать»: открыт максимум у одной карточки, сетку не двигает. */
const { isOpen, close: closePopover, summaryOf, openWithSummary } = useCardPopover()

/** Состояние саммари именно этой карточки. */
const summaryState = computed(() => summaryOf(props.card.id))

/** Куда сохранить готовое саммари файлом. */
const targetFolderId = ref<string>('')
const saving = ref<boolean>(false)
const saved = ref<boolean>(false)

const folderItems = computed(() =>
  folders.value.map((folder) => ({ label: folder.name, value: folder.id })),
)

/** По умолчанию — «Мои знания», если она есть в списке. */
const defaultFolderId = computed<string>(() => {
  const root = folders.value.find((folder) => folder.isRoot === true)

  return root?.id ?? folders.value[0]?.id ?? ''
})

// Модалку открыли — подставляем папку по умолчанию (watch ниже, после summaryOpen).
watch(() => summaryState.value.status, (status) => {
  if (status === 'loading') {
    saved.value = false
  }

  if (!targetFolderId.value) {
    targetFolderId.value = defaultFolderId.value
  }
})

/** Кладёт готовое саммари файлом в выбранную папку. */
async function saveSummaryToFolder(): Promise<void> {
  const folder = folders.value.find((item) => item.id === targetFolderId.value)
  const text = summaryState.value.text.trim()

  if (!folder || text.length === 0 || saving.value || saved.value) {
    return
  }

  saving.value = true

  try {
    await addNote({
      title: `${props.card.title} — саммари`,
      content: props.card.url ? `${text}\n\nИсточник: ${props.card.url}` : text,
      folderId: folder.id,
      itemId: props.card.id,
      url: props.card.url ?? null,
    })

    saved.value = true
    notify.success(`Файл добавлен в «${folder.name}»`)
  } catch (error) {
    notify.fail(error, 'Не удалось добавить файл')
  } finally {
    saving.value = false
  }
}

/** Кнопка/блок карточки запускают запрос саммари (повторно — без запроса). */
function handleSummarize(): void {
  if (!canUseAi.value) {
    // Без аккаунта сначала вход, иначе — модалка своего ключа.
    if (isAuth.value) {
      openKeyModal()
    } else {
      openAuthModal()
    }

    return
  }

  void openWithSummary(props.card)
}

const summaryOpen = computed<boolean>({
  get: () => isOpen(props.card.id),
  set: (value: boolean) => {
    if (!value && isOpen(props.card.id)) {
      closePopover()
    }
  },
})

// Модалку открыли — подставляем папку по умолчанию, если ещё не выбрана.
watch(summaryOpen, (open) => {
  if (open && !targetFolderId.value) {
    targetFolderId.value = defaultFolderId.value
  }
})

/** Иконка-заглушка превью по типу источника. */
const TYPE_ICON: Readonly<Record<CardType, string>> = {  youtube: '▶',
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
  <article
    class="group flex h-full flex-col overflow-hidden border bg-surface transition-shadow"
    :class="[
      selected ? 'border-accent ring-2 ring-accent/30' : 'border-line',
      'rounded-2xl hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]',
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

      <!--
        «Суммировать»: без доступа к ИИ кнопка заперта и показывает ту же
        подсказку, что и на доске («свой ключ или премиум» / «нужен вход»).
      -->
      <AiFeaturePopover v-if="!canUseAi" feature="Суммировать ИИ">
        <UButton
          type="button"
          color="neutral"
          variant="solid"
          size="xs"
          icon="i-lucide-lock"
          label="Суммировать"
          class="touch-control max-sm:opacity-100 absolute bottom-2 left-2 rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100"
          :aria-label="`Суммировать «${card.title}» — нужен доступ к ИИ`"
          @click.stop="handleSummarize"
        />
      </AiFeaturePopover>

      <UButton
        v-else
        type="button"
        color="neutral"
        variant="solid"
        size="xs"
        icon="i-lucide-sparkles"
        label="Суммировать"
        class="touch-control max-sm:opacity-100 absolute bottom-2 left-2 rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100"
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
        class="touch-control max-sm:opacity-100 absolute right-2 top-2 rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100"
        :aria-label="`Удалить «${card.title}»`"
        @click="handleDelete"
      />
    </div>

    <!-- Информационный блок карточки: клик по карточке ничего не открывает -->
    <div class="relative flex flex-1 flex-col gap-1 p-2">
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

    <!-- Саммари открывается модалкой по кнопке «Суммировать» -->
    <UModal
      v-model:open="summaryOpen"
      title="Саммари"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #body>
        <div class="flex flex-col gap-3">
          <p class="line-clamp-2 text-sm font-semibold leading-snug text-ink">
            {{ card.title }}
          </p>

          <!-- Заглушка, пока идёт запрос саммари -->
          <div
            v-if="summaryState.status === 'loading'"
            class="flex flex-col gap-2"
            role="status"
            aria-live="polite"
          >
            <span class="sr-only">Собираем саммари…</span>
            <div class="h-3 w-full animate-pulse rounded bg-[#ededed]" />
            <div class="h-3 w-11/12 animate-pulse rounded bg-[#ededed]" />
            <div class="h-3 w-8/12 animate-pulse rounded bg-[#ededed]" />
          </div>

          <!-- Ошибка запроса -->
          <p
            v-else-if="summaryState.status === 'error'"
            class="text-sm leading-snug text-[#b3261e]"
          >
            {{ summaryState.text }}
          </p>

          <!-- Готовый текст саммари -->
          <template v-else-if="summaryState.status === 'ready'">
            <p class="max-h-80 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-dim">
              {{ summaryState.text }}
            </p>

            <!-- Готовое саммари можно сразу положить файлом в папку -->
            <div class="flex flex-wrap items-center gap-2">
              <USelect
                v-model="targetFolderId"
                :items="folderItems"
                size="sm"
                class="min-w-0 flex-1"
                placeholder="Папка"
                aria-label="Папка для файла"
              />

              <UButton
                type="button"
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-file-plus"
                :label="saved ? 'Добавлено' : 'В папку'"
                class="rounded-lg"
                :loading="saving"
                :disabled="saving || saved || !targetFolderId"
                @click="saveSummaryToFolder"
              />
            </div>
          </template>

          <p v-else class="text-sm leading-snug text-dim">
            Нажмите «Суммировать», чтобы получить краткое содержание.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end">
          <UButton
            type="button"
            color="neutral"
            variant="ghost"
            size="md"
            label="Закрыть"
            class="rounded-xl"
            @click="closePopover"
          />
        </div>
      </template>
    </UModal>
  </article>
</template>

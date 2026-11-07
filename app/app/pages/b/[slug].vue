<script setup lang="ts">
/**
 * Публичная подборка: открывается по ссылке `/b/<slug>` без входа.
 *
 * Главное на странице — **доска**: узлы с координатами приходят из
 * `GET /api/public/:slug`, страница рисует их только для чтения. Если у
 * старой ссылки раскладки ещё нет, показываем список материалов.
 */
import { apiFetch, useApiBase } from '~/api/client'
import { copyFolder } from '~/api/notes'
import type { Card } from '~/types/card'
import type { Note } from '~/api/notes'

definePageMeta({ layout: 'landing' })

interface PublicNode {
  itemId?: string
  noteId?: string
  x: number
  y: number
  width?: number
  height?: number
}

interface PublicCollection {
  slug: string
  kind: 'folder' | 'board'
  title: string
  notes: Note[]
  cards: Card[]
  nodes: PublicNode[]
  folderId: string | null
  boardId: string | null
  createdAt: string
}

/** Размеры блоков, если в базе не сохранены. */
const CARD_WIDTH = 200
const FILE_WIDTH = 280
const BLOCK_HEIGHT = 220
const PADDING = 24

const route = useRoute()
const apiBase = useApiBase()
const notify = useNotify()
const { isAuth, openModal: openAuthModal } = (() => {
  const auth = useAuth()
  const modal = useAuthModal()

  return { isAuth: auth.isAuth, openModal: modal.openModal }
})()
const saving = ref<boolean>(false)

/**
 * «Сохранить себе»: копирует опубликованную папку вместе с доской в аккаунт.
 * Без входа — сначала предлагает войти.
 */
async function saveToMine(): Promise<void> {
  const current = collection.value
  const folderId = current?.folderId ?? null

  if (!current || !folderId || saving.value) {
    if (current && !folderId) {
      notify.error('Эту подборку нельзя скопировать: у неё нет папки')
    }

    return
  }

  if (!isAuth.value) {
    openAuthModal()

    return
  }

  saving.value = true

  try {
    const copy = await copyFolder(apiBase, folderId)

    notify.success(`Сохранено: «${copy.name}»`)
    const tabs = useBoardTabs()
    tabs.restore()
    tabs.open(copy.id, copy.name)

    await navigateTo({ path: '/board', query: { folder: copy.id } })
  } catch (error) {
    notify.fail(error, 'Не удалось сохранить себе')
  } finally {
    saving.value = false
  }
}

const slug = computed<string>(() => String(route.params.slug ?? ''))
const collection = ref<PublicCollection | null>(null)
const failure = ref<string>('')
const loading = ref<boolean>(true)

onMounted(async () => {
  try {
    const res = await apiFetch<{ collection: PublicCollection }>(
      apiBase,
      `/api/public/${encodeURIComponent(slug.value)}`,
    )

    collection.value = res.collection
  } catch (err) {
    failure.value = (err as { data?: { message?: string } })?.data?.message ?? 'Подборка не найдена'
  } finally {
    loading.value = false
  }
})

useHead(() => ({
  title: collection.value ? `${collection.value.title} — Полка` : 'Подборка — Полка',
  meta: collection.value
    ? [{ name: 'description', content: `Публичная подборка «${collection.value.title}» в Полке` }]
    : [],
}))

const cardById = computed<Map<string, Card>>(
  () => new Map((collection.value?.cards ?? []).map((card) => [card.id, card])),
)
const noteById = computed<Map<string, Note>>(
  () => new Map((collection.value?.notes ?? []).map((note) => [note.id, note])),
)

interface PlacedBlock {
  key: string
  kind: 'card' | 'file'
  x: number
  y: number
  width: number
  height: number
  card?: Card
  note?: Note
}

/** Узлы доски → блоки. Неизвестные элементы (удалённые) просто пропускаем. */
const placed = computed<PlacedBlock[]>(() => {
  const result: PlacedBlock[] = []

  for (const node of collection.value?.nodes ?? []) {
    if (node.itemId) {
      const card = cardById.value.get(node.itemId)

      if (card) {
        result.push({
          key: card.id,
          kind: 'card',
          card,
          x: node.x,
          y: node.y,
          width: node.width ?? CARD_WIDTH,
          height: node.height ?? BLOCK_HEIGHT,
        })
      }

      continue
    }

    if (node.noteId) {
      const note = noteById.value.get(node.noteId)

      if (note) {
        result.push({
          key: note.id,
          kind: 'file',
          note,
          x: node.x,
          y: node.y,
          width: node.width ?? FILE_WIDTH,
          height: node.height ?? BLOCK_HEIGHT,
        })
      }
    }
  }

  return result
})

/** Логический размер холста — по самому правому/нижнему блоку. */
const canvasWidth = computed<number>(
  () => placed.value.reduce((max, block) => Math.max(max, block.x + block.width), 0) + PADDING * 2,
)
const canvasHeight = computed<number>(
  () => placed.value.reduce((max, block) => Math.max(max, block.y + block.height), 0) + PADDING * 2,
)

const hasBoard = computed<boolean>(() => placed.value.length > 0)
const total = computed<number>(
  () => (collection.value?.notes.length ?? 0) + (collection.value?.cards.length ?? 0),
)
</script>

<template>
  <div class="min-h-dvh bg-app">
    <div class="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-6 sm:px-8">
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          to="/"
          color="neutral"
          variant="ghost"
          size="md"
          icon="i-lucide-arrow-left"
          label="В Полку"
          class="rounded-xl"
        />

        <UButton
          v-if="collection?.folderId"
          type="button"
          color="primary"
          variant="solid"
          size="md"
          icon="i-lucide-bookmark-plus"
          label="Сохранить себе"
          class="rounded-xl"
          :loading="saving"
          @click="saveToMine"
        />
      </div>

      <p v-if="loading" class="text-sm text-mute">Загружаем подборку…</p>

      <p v-else-if="failure" class="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-dim">
        {{ failure }}
      </p>

      <template v-else-if="collection">
        <header class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 class="text-2xl font-semibold leading-tight text-ink">{{ collection.title }}</h1>
          <p class="text-xs text-mute">Публичная доска · {{ total }} материалов</p>
        </header>

        <!-- Доска только для чтения: масштаб и перетаскивание не нужны -->
        <div
          v-if="hasBoard"
          class="relative overflow-auto rounded-2xl border border-line bg-surface"
        >
          <div
            class="relative origin-top-left"
            :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }"
          >
            <article
              v-for="block in placed"
              :key="`${block.kind}-${block.key}`"
              class="absolute flex flex-col overflow-hidden rounded-xl border border-line bg-app p-3"
              :style="{
                left: `${block.x}px`,
                top: `${block.y}px`,
                width: `${block.width}px`,
                height: `${block.height}px`,
              }"
            >
              <!-- Карточка: заголовок, обложка и ссылка на источник -->
              <template v-if="block.kind === 'card' && block.card">
                <a
                  v-if="block.card.url"
                  :href="block.card.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="line-clamp-3 text-sm font-semibold leading-snug text-ink hover:underline"
                >
                  {{ block.card.title }}
                </a>
                <p v-else class="line-clamp-3 text-sm font-semibold leading-snug text-ink">
                  {{ block.card.title }}
                </p>

                <img
                  v-if="block.card.thumbnail"
                  :src="block.card.thumbnail"
                  alt=""
                  loading="lazy"
                  class="mt-2 min-h-0 w-full flex-1 rounded-lg object-cover"
                >
                <p v-else-if="block.card.summary" class="mt-1 line-clamp-4 text-xs leading-snug text-dim">
                  {{ block.card.summary }}
                </p>

                <span class="mt-auto pt-2 text-[11px] uppercase tracking-wide text-mute">
                  {{ block.card.type }}
                </span>
              </template>

              <!-- Файл-заметка: заголовок и начало текста -->
              <template v-else-if="block.kind === 'file' && block.note">
                <p class="line-clamp-2 text-sm font-semibold leading-snug text-ink">
                  {{ block.note.title }}
                </p>
                <p class="mt-1 line-clamp-6 whitespace-pre-line text-xs leading-snug text-dim">
                  {{ block.note.content }}
                </p>
              </template>
            </article>
          </div>
        </div>

        <!-- Старые ссылки без раскладки: список материалов -->
        <template v-else>
          <section v-if="collection.cards.length > 0" class="flex flex-col gap-2">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-mute">Карточки</h2>

            <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <li
                v-for="card in collection.cards"
                :key="card.id"
                class="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3"
              >
                <a
                  :href="card.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="line-clamp-2 text-sm font-semibold leading-snug text-ink hover:underline"
                >
                  {{ card.title }}
                </a>
                <p v-if="card.summary" class="line-clamp-2 text-xs leading-snug text-dim">{{ card.summary }}</p>
              </li>
            </ul>
          </section>

          <section v-if="collection.notes.length > 0" class="flex flex-col gap-2">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-mute">Заметки</h2>

            <ul class="flex flex-col gap-3">
              <li
                v-for="note in collection.notes"
                :key="note.id"
                class="rounded-xl border border-line bg-surface p-3"
              >
                <p class="text-sm font-semibold text-ink">{{ note.title }}</p>
                <p class="mt-1 whitespace-pre-line text-xs leading-snug text-dim">{{ note.content }}</p>
              </li>
            </ul>
          </section>
        </template>
      </template>
    </div>
  </div>
</template>

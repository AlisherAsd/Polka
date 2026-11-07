<script setup lang="ts">
/**
 * Публичная доска по ссылке `/board?share=<slug>`.
 *
 * Тот же холст, что и в приложении, но только для чтения и без входа:
 * координаты и размеры узлов приходят из `GET /api/public/:slug`.
 * Отдельной страницы подборки нет — ссылка открывает страницу доски.
 */
import { apiFetch, useApiBase } from '~/api/client'
import type { Card } from '~/types/card'
import type { Note } from '~/api/notes'

const props = defineProps<{ slug: string }>()

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

const apiBase = useApiBase()
const collection = ref<PublicCollection | null>(null)
const failure = ref<string>('')
const loading = ref<boolean>(true)

async function load(slug: string): Promise<void> {
  loading.value = true
  failure.value = ''

  try {
    const res = await apiFetch<{ collection: PublicCollection }>(
      apiBase,
      `/api/public/${encodeURIComponent(slug)}`,
    )

    collection.value = res.collection
  } catch (err) {
    collection.value = null
    failure.value = (err as { data?: { message?: string } })?.data?.message ?? 'Доска не найдена'
  } finally {
    loading.value = false
  }
}

onMounted(() => void load(props.slug))

watch(() => props.slug, (next) => {
  if (next) {
    void load(next)
  }
})

useHead(() => ({
  title: collection.value ? `${collection.value.title} — Полка` : 'Доска — Полка',
  meta: collection.value
    ? [{ name: 'description', content: `Публичная доска «${collection.value.title}» в Полке` }]
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

/** Узлы доски → блоки. Удалённые из базы элементы просто пропускаем. */
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
  <section class="flex min-h-0 w-full flex-1 flex-col">
    <header class="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2 sm:px-8">
      <h1 class="max-w-[60vw] truncate text-base font-semibold text-ink sm:text-lg">
        {{ collection?.title ?? 'Доска' }}
      </h1>
      <span v-if="collection" class="text-xs text-mute">
        публичная доска · {{ total }} материалов
      </span>
    </header>

    <div class="relative min-h-0 flex-1 overflow-auto bg-app">
      <p v-if="loading" class="px-4 py-6 text-sm text-mute sm:px-8">Загружаем доску…</p>

      <p
        v-else-if="failure"
        class="mx-4 my-6 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-dim sm:mx-8"
      >
        {{ failure }}
      </p>

      <template v-else>
        <!-- Доска только для чтения: масштаб и перетаскивание не нужны -->
        <div
          v-if="hasBoard"
          class="relative origin-top-left"
          :style="{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }"
        >
          <article
            v-for="block in placed"
            :key="`${block.kind}-${block.key}`"
            class="absolute flex flex-col overflow-hidden rounded-xl border border-line bg-surface p-3"
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

        <p v-else class="px-4 py-6 text-sm text-mute sm:px-8">
          На этой доске пока пусто.
        </p>
      </template>
    </div>
  </section>
</template>

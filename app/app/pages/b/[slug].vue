<script setup lang="ts">
/**
 * Публичная подборка: открывается по ссылке `/b/<slug>` без входа.
 *
 * Раскладка как у лендинга (без сайдбара и хедера). Данные приходят из
 * `GET /api/public/:slug` — только то, что владелец опубликовал.
 */
import { apiFetch, useApiBase } from '~/api/client'
import { copyFolder } from '~/api/notes'
import type { Card } from '~/types/card'
import type { Note } from '~/api/notes'

definePageMeta({ layout: 'landing' })

interface PublicCollection {
  slug: string
  kind: 'folder' | 'board'
  title: string
  notes: Note[]
  cards: Card[]
  folderId: string | null
  boardId: string | null
  createdAt: string
}

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
 * «Сохранить себе»: копирует опубликованную папку вместе с доской в аккаунт
 * пользователя. Без входа — сначала предлагает войти.
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

const total = computed<number>(
  () => (collection.value?.notes.length ?? 0) + (collection.value?.cards.length ?? 0),
)
</script>

<template>
  <div class="min-h-dvh bg-app">
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
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

        <!-- Открыть доску этой папки внутри приложения (вкладкой) -->
        <UButton
          v-if="collection?.folderId"
          :to="`/board?folder=${collection.folderId}`"
          color="neutral"
          variant="outline"
          size="md"
          icon="i-lucide-layout-dashboard"
          label="Открыть доску"
          class="rounded-xl"
        />
      </div>

      <p v-if="loading" class="text-sm text-mute">Загружаем подборку…</p>

      <p v-else-if="failure" class="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-dim">
        {{ failure }}
      </p>

      <template v-else-if="collection">
        <header class="flex flex-col gap-2">
          <h1 class="text-3xl font-semibold leading-tight text-ink">{{ collection.title }}</h1>
          <p class="text-xs text-mute">Публичная подборка · {{ total }} материалов</p>
        </header>

        <UButton
          type="button"
          color="primary"
          variant="solid"
          size="md"
          icon="i-lucide-bookmark-plus"
          label="Сохранить себе"
          class="self-start rounded-xl px-5"
          :loading="saving"
          @click="saveToMine"
        />

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
    </div>
  </div>
</template>

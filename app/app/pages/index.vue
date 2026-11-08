<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { fetchHome, type HomeFolder, type HomePublicBoard } from '~/api/home'
import { useApiBase } from '~/api/client'

/**
 * Главная страница — доски.
 *
 * Сверху свои папки (без «Мои знания»), ниже сепаратор и общая лента
 * публичных досок: любая опубликованная доска видна здесь всем.
 */
const apiBase = useApiBase()
const { isAuth } = useAuth()

const folders = ref<HomeFolder[]>([])
const publicBoards = ref<HomePublicBoard[]>([])
const loading = ref<boolean>(true)
const failure = ref<string>('')

const skeletonCount = 4

async function load(): Promise<void> {
  loading.value = true
  failure.value = ''

  try {
    const data = await fetchHome(apiBase)

    folders.value = data.folders
    publicBoards.value = data.publicBoards
  } catch (error) {
    failure.value = (error as { data?: { message?: string } })?.data?.message
      ?? 'Не удалось загрузить доски'
  } finally {
    loading.value = false
  }
}

// Вход подтягивается после старта: до него показываем только публичную ленту.
// На сервере не грузим: `$fetch` с относительным URL работает только на клиенте.
watch(isAuth, () => {
  if (import.meta.client) {
    void load()
  }
}, { immediate: true })

const foldersTitle = computed<string>(() => {
  const count = folders.value.length

  return `${count} ${count === 1 ? 'доска' : count < 5 ? 'доски' : 'досок'}`
})

useHead({ title: 'Доска — Полка' })
</script>

<template>
  <section class="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 pb-10 pt-6 sm:px-8">
    <header class="flex flex-wrap items-baseline gap-2">
      <h1 class="text-2xl font-bold leading-8 text-ink">Доска</h1>
      <span v-if="isAuth && !loading" class="text-sm text-mute">{{ foldersTitle }}</span>
    </header>

    <p
      v-if="failure"
      role="alert"
      class="rounded-xl border border-[#f5b7b1] bg-[#fdecea] px-4 py-2.5 text-sm text-[#b3261e]"
    >
      {{ failure }}
    </p>

    <!-- Свои доски -->
    <AuthGate
      v-if="!isAuth"
      feature="Ваши доски"
      description="Войдите, чтобы видеть свои папки и раскладывать материалы по доскам."
      compact
    />

    <template v-else>
      <ul
        v-if="loading"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        aria-busy="true"
        aria-live="polite"
      >
        <li
          v-for="index in skeletonCount"
          :key="index"
          class="overflow-hidden rounded-2xl border border-line bg-surface"
        >
          <div class="aspect-video w-full animate-pulse bg-[#e8e8e8]" />
          <div class="flex flex-col gap-1 p-2">
            <div class="h-3.5 w-5/6 animate-pulse rounded bg-[#ededed]" />
            <div class="h-2.5 w-2/5 animate-pulse rounded bg-[#f1f1f1]" />
          </div>
        </li>
      </ul>

      <ul
        v-else-if="folders.length > 0"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      >
        <li v-for="folder in folders" :key="folder.id">
          <BoardCard
            :title="folder.name"
            :to="`/board?folder=${folder.id}`"
            :files="folder.files"
            :preview="folder.preview"
            :is-public="Boolean(folder.shareSlug)"
          />
        </li>
      </ul>

      <EmptyState
        v-else-if="!loading"
        title="Досок пока нет"
        description="Создайте папку в панели «Файлы» — у неё сразу появится своя доска."
      />
    </template>

    <!-- Публичные доски всех пользователей -->
    <template v-if="publicBoards.length > 0">
      <div class="flex items-center gap-3 pt-2">
        <span class="shrink-0 text-xs font-semibold uppercase tracking-wide text-mute">
          Публичные доски
        </span>
        <div class="h-px min-w-0 flex-1 bg-line" aria-hidden="true" />
      </div>

      <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <li v-for="board in publicBoards" :key="board.slug">
          <BoardCard
            :title="board.title"
            :to="`/board?share=${board.slug}`"
            :files="board.files"
            :preview="board.preview"
            is-public
            :author="board.author"
          />
        </li>
      </ul>
    </template>
  </section>
</template>

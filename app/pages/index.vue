<script setup lang="ts">
import { computed, onMounted } from 'vue'

const { cards, loading, error, isEmpty, count, selectedIds, toggleSelection, removeCard, init } =
  useCards()

/** Пока идёт хотя бы один запрос к внешнему источнику — показываем скелетоны. */
const showSkeletons = computed<boolean>(() => loading.value)
const skeletonCount = 4

onMounted(() => {
  // localStorage читается только здесь, на клиенте (SSR рендерит пустой список).
  init()
})

function handleDelete(id: string): void {
  removeCard(id)
}
</script>

<template>
  <section class="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 pb-10 pt-6 sm:px-8">
    <header class="flex flex-wrap items-baseline gap-2">
      <h1 class="text-2xl font-bold leading-8 text-ink">Сегодня</h1>
      <span class="text-sm text-mute">
        {{ count }} {{ count === 1 ? 'карточка' : 'карточек' }}
      </span>
    </header>

    <p
      v-if="error"
      role="alert"
      class="rounded-xl border border-[#f5b7b1] bg-[#fdecea] px-4 py-2.5 text-sm text-[#b3261e]"
    >
      {{ error }}
    </p>

    <!-- Загрузка: скелетоны той же сетки, чтобы не прыгала вёрстка -->
    <ul
      v-if="showSkeletons"
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
          <div class="h-3.5 w-3/5 animate-pulse rounded bg-[#ededed]" />
          <div class="h-2.5 w-2/5 animate-pulse rounded bg-[#f1f1f1]" />
        </div>
      </li>
    </ul>

    <CardGrid
      v-else-if="cards.length > 0"
      :cards="cards"
      :selected-ids="selectedIds"
      @delete="handleDelete"
      @toggle="toggleSelection"
    />

    <!-- Пустое состояние -->
    <div
      v-else-if="isEmpty"
      class="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-soft bg-surface/60 px-6 py-16 text-center"
    >
      <span class="text-3xl" aria-hidden="true">◌</span>
      <h2 class="text-base font-semibold text-ink">Пока пусто</h2>
      <p class="max-w-sm text-sm text-dim">
        Вставьте ссылку на видео YouTube или TikTok, пост в Telegram или статью — она появится
        здесь и сохранится в браузере.
      </p>
    </div>

    <SelectionBar />
  </section>
</template>

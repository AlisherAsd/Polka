<script setup lang="ts">
/**
 * Тонкая вертикальная рейка навигации.
 * Все интерактивные элементы — `UButton` из Nuxt UI, иконки — i-lucide-*.
 * Лого и аватар остаются `div`/`NuxtLink` с текстом (изображения не используются).
 */

const route = useRoute()
const { openModal } = useAddModal()

const isHome = computed<boolean>(() => route.path === '/')
const isChat = computed<boolean>(() => route.path === '/chat')
</script>

<template>
  <aside
    class="sticky top-0 flex h-dvh w-16 shrink-0 flex-col items-center gap-3 border-r border-line bg-surface py-3 sm:w-[68px]"
    aria-label="Основная навигация"
  >
    <!-- Лого-заглушка -->
    <NuxtLink
      to="/"
      class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-white"
      aria-label="Recall — на главную"
    >
      R
    </NuxtLink>

    <!-- Кнопка добавления -->
    <UButton
      type="button"
      color="neutral"
      variant="solid"
      size="sm"
      icon="i-lucide-plus"
      square
      class="rounded-full"
      aria-label="Добавить ссылку"
      @click="openModal"
    />

    <div class="h-px w-6 shrink-0 bg-line" aria-hidden="true" />

    <!-- Навигация -->
    <nav class="flex flex-col items-center gap-1" aria-label="Разделы">
      <UButton
        :to="'/'"
        color="neutral"
        :variant="isHome ? 'soft' : 'ghost'"
        size="md"
        icon="i-lucide-house"
        square
        class="rounded-xl"
        title="Главная"
        aria-label="Главная"
        :aria-current="isHome ? 'page' : undefined"
      />

      <UButton
        to="/chat"
        color="neutral"
        :variant="isChat ? 'soft' : 'ghost'"
        size="md"
        icon="i-lucide-message-circle-question"
        square
        class="rounded-xl"
        title="Чат"
        aria-label="Чат"
        :aria-current="isChat ? 'page' : undefined"
      />
    </nav>

    <div class="flex-1" aria-hidden="true" />

    <!-- Профиль-заглушка -->
    <UButton
      type="button"
      color="neutral"
      variant="outline"
      size="sm"
      icon="i-lucide-user"
      square
      class="rounded-full"
      aria-label="Профиль"
      title="Профиль"
    />
  </aside>
</template>

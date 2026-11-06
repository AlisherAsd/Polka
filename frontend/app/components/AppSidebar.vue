<script setup lang="ts">
/**
 * Тонкая вертикальная рейка навигации.
 * Все интерактивные элементы — `UButton` из Nuxt UI, иконки — i-lucide-*.
 * Лого и аватар остаются `div`/`NuxtLink` с текстом (изображения не используются).
 */

const route = useRoute()
const { openModal } = useAddModal()
const { openModal: openAuthModal } = useAuthModal()
const { isAuth } = useAuth()

const isHome = computed<boolean>(() => route.path === '/')
const isChat = computed<boolean>(() => route.path === '/chat')
const isBoard = computed<boolean>(() => route.path === '/board')
</script>

<template>
  <aside
    class="sticky top-0 flex h-dvh w-16 shrink-0 flex-col items-center gap-6 border-r border-line bg-surface py-3 sm:w-[68px]"
    aria-label="Основная навигация">
    <!-- Лого (с версией в поповере): только на десктопе, на мобильном оно в AppMobileHeader -->
    <div class="hidden w-full justify-center sm:flex">
      <AppLogo />
    </div>

    <!-- Кнопка добавления -->
    <UButton type="button" color="primary" variant="solid" size="md" icon="i-lucide-plus" square class="rounded-full"
      aria-label="Добавить ссылку" @click="openModal" />

    <div class="h-px w-6 shrink-0 bg-line" aria-hidden="true" />

    <!-- Навигация -->
    <nav class="flex flex-col items-center gap-3" aria-label="Разделы">
      <UButton :to="'/'" color="neutral" :variant="isHome ? 'soft' : 'ghost'" size="md" icon="i-lucide-house" square
        class="rounded-xl" title="Главная" aria-label="Главная" :aria-current="isHome ? 'page' : undefined" />

      <AuthRequiredPopover v-if="!isAuth" feature="Чат">
        <UButton type="button" color="neutral" variant="ghost" size="md" icon="i-lucide-message-circle-question" square
          class="rounded-xl opacity-40" aria-label="Чат" @click.prevent />
      </AuthRequiredPopover>

      <UButton v-else to="/chat" color="neutral" :variant="isChat ? 'soft' : 'ghost'" size="md"
        icon="i-lucide-message-circle-question" square class="rounded-xl" title="Чат" aria-label="Чат"
        :aria-current="isChat ? 'page' : undefined" />

      <UButton to="/board" color="neutral" :variant="isBoard ? 'soft' : 'ghost'" size="md"
        icon="i-lucide-layout-dashboard" square class="rounded-xl" title="Доска" aria-label="Доска"
        :aria-current="isBoard ? 'page' : undefined" />
    </nav>

    <div class="flex-1" aria-hidden="true" />

    <!-- Профиль: гость — вход, авторизован — аватар с первой буквой и модалка профиля -->
    <AppProfileButton />
  </aside>
</template>

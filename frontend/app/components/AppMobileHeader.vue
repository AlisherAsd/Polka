<script setup lang="ts">
/**
 * Верхняя панель для мобильных (< sm).
 * Слева — лого, справа — стрелка второй панели (файлы) и бургер меню.
 * Полноценный хедер для десктопа — `AppHeader.vue`.
 */
const { open: sidePanelOpen, toggleSidePanel } = useSidePanel()
const { isAuth } = useAuth()
const { toggleMenu } = useMobileMenu()
</script>

<template>
  <header
    class="flex h-14 min-w-0 items-center justify-between gap-2 border-b border-line bg-surface px-3 sm:hidden"
  >
    <!-- Слева: лого (то же, что в сайдбаре) — с версией в поповере -->
    <AppLogo />

    <!-- Справа: файлы + меню -->
    <div class="flex shrink-0 items-center gap-1">
      <AuthRequiredPopover v-if="!isAuth" feature="Доступ к папкам">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="md"
          square
          icon="i-lucide-chevron-left"
          aria-label="Файлы"
          class="rounded-lg opacity-40"
          @click.prevent
        />
      </AuthRequiredPopover>

      <UButton
        v-else
        type="button"
        color="neutral"
        variant="ghost"
        size="md"
        square
        icon="i-lucide-chevron-left"
        :aria-label="sidePanelOpen ? 'Скрыть файлы' : 'Показать файлы'"
        :aria-expanded="sidePanelOpen"
        :class="['rounded-lg transition-transform', sidePanelOpen ? 'rotate-180' : 'rotate-0']"
        @click="toggleSidePanel"
      />

      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        size="md"
        square
        icon="i-lucide-menu"
        aria-label="Меню"
        aria-haspopup="dialog"
        class="rounded-lg"
        @click="toggleMenu"
      />
    </div>
  </header>
</template>

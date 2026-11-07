<script setup lang="ts">
/** Вторая панель: открыта/закрыта, ширина и состояние перетаскивания. */
const { open, width: panelWidth, setWidth, restoreWidth } = useSidePanel()

/** Пока тянут разделитель, анимацию ширины выключаем. */
const resizing = ref<boolean>(false)

onMounted(() => {
  // Ширина, которую пользователь выставил в прошлый раз.
  restoreWidth()
})
</script>

<template>
  <!--
    Раскладка на CSS Grid с именованными областями (см. утилиты .layout-areas в main.css):
      ≥ sm: "sidebar header" / "sidebar main" — постоянная рейка + полный хедер;
      < sm: "mobile-header ..." / "main ..." — рейки нет, навигация в шторке.
    Сайдбар и вторая панель скрыты на мобильном: их место занимают
    `AppMobileHeader` и `AppMobileMenu`.
  -->
  <div class="layout-areas min-h-dvh bg-app">
    <!--
      Область `header` занимает ровно один элемент: `hidden` на самом
      компоненте не убирает его из grid-зоны (там остаются оба хедера
      и растягивают строку), поэтому прячем через display: none на обёртке.
    -->
    <div class="layout-area-sidebar hidden sm:flex">
      <AppSidebar />
    </div>

    <div class="layout-area-header hidden sm:flex">
      <AppHeader class="w-full" />
    </div>

    <div class="layout-area-header flex sm:hidden">
      <AppMobileHeader class="w-full" />
    </div>

    <AppMobileMenu />

    <main class="layout-area-main flex min-w-0 overflow-x-hidden">
      <!--
        Вторая панель: на десктопе выезжает шириной, на мобильном —
        фиксированной шторкой справа на весь экран.
      -->
      <div
        class="hidden shrink-0 overflow-hidden sm:block"
        :class="[
          open ? 'opacity-100' : 'opacity-0',
          // Пока тянем разделитель — без transition, иначе ширина «плывёт».
          resizing ? '' : 'transition-[width,opacity] duration-300 ease-in-out',
        ]"
        :style="{ width: open ? `${panelWidth}px` : '0px' }"
      >
        <SecondSidebar :style="{ width: `${panelWidth}px` }" />
      </div>

      <!-- Перетаскивание ширины панели -->
      <SidePanelResizer
        v-if="open"
        class="hidden sm:block"
        :width="panelWidth"
        @resize="setWidth"
        @active="resizing = $event"
      />

      <!-- Мобильная шторка файлов -->
      <div v-if="open" class="fixed inset-0 z-40 bg-black/40 sm:hidden" aria-hidden="true" @click="open = false" />

      <div
        class="fixed inset-y-0 right-0 z-50 w-64 overflow-hidden border-l border-line transition-transform duration-300 ease-in-out sm:hidden"
        :class="open ? 'translate-x-0' : 'translate-x-full'">
        <SecondSidebar class="h-full w-full" />
      </div>

      <div class="min-w-0 flex-1 overflow-x-hidden">
        <slot />
      </div>
    </main>

    <AppAddLinkModal />

    <AppTagsModal />

    <AppFolderModal />

    <AppAuthModal />

    <AppAiKeyModal />

    <AppPremiumModal />

    <AppProfileModal />

    <AppConfirmModal />
  </div>
</template>

<script setup lang="ts">
const { open } = useSidePanel()
</script>

<template>
  <!--
    Раскладка на CSS Grid с именованными областями (см. утилиты .layout-areas в main.css):
      "sidebar header"
      "sidebar main"
    На мобильном (≤sm) область схлопывается в одну колонку без areas:
      "header"
      "main"
    Сайдбар при этом остаётся той же вертикальной рейкой слева — он выведен
    из grid-flow (position: fixed внутри .layout-areas) и не занимает место в стопке.
  -->
  <div class="layout-areas min-h-dvh bg-app">
    <AppSidebar class="layout-area-sidebar" />

    <AppHeader class="layout-area-header" />

    <!--
      Вторая панель живёт внутри области `main`: grid-areas не меняются,
      а на мобильном она скрыта (hidden sm:flex).
    -->
    <main class="layout-area-main flex min-w-0 overflow-x-hidden">
      <!--
        Ширина анимируется вместе с выездом: при закрытии место под панель
        схлопывается, и контент плавно прилипает влево.
      -->
      <div
        class="hidden shrink-0 overflow-hidden transition-[width,translate,opacity] duration-300 ease-in-out will-change-[width] sm:block"
        :class="open ? 'w-56 border-r border-line opacity-100' : 'w-0 border-r-0 opacity-0'"
      >
        <SecondSidebar class="transition-transform duration-300 ease-in-out" :class="open ? 'translate-x-0' : '-translate-x-56'" />
      </div>

      <div class="min-w-0 flex-1 overflow-x-hidden">
        <slot />
      </div>
    </main>

    <AppAddLinkModal />

    <AppTagsModal />

    <AppFolderModal />

    <AppAuthModal />
  </div>
</template>

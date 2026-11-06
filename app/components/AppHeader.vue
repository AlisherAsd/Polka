<script setup lang="ts">
/**
 * Верхняя панель (область `header` в grid-template-areas).
 * Поиск, «Ask chat» и уведомления — заглушки: функциональности нет, только вёрстка.
 * Все контролы — компоненты Nuxt UI (`UInput`, `UButton`), иконки — i-lucide-*.
 */

const emit = defineEmits<{
  /** Иконка уведомлений — заглушка. */
  notifications: []
}>()

const { openModal } = useAddModal()
const { open: sidePanelOpen, toggleSidePanel } = useSidePanel()
const { isAuth } = useAuth()

/** Заглушка поиска: поле управляется локально, но никуда не отправляет запрос. */
const searchQuery = ref<string>('')

function handleAsk(): void {
  navigateTo('/chat')
}

function handleNotifications(): void {
  emit('notifications')
}
</script>

<template>
  <header
    class="flex min-h-14 min-w-0 flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2 sm:gap-3 sm:px-6">
    <!-- Левая группа: поиск + «Ask chat» -->
    <div class="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
      <!-- Переключатель второй панели (папки — только после входа) -->
      <AuthRequiredPopover v-if="!isAuth" feature="Доступ к папкам">
        <UButton type="button" color="neutral" variant="ghost" size="md" square icon="i-lucide-chevron-right"
          :aria-label="sidePanelOpen ? 'Закрыть панель' : 'Открыть панель'" :aria-expanded="sidePanelOpen"
          :class="['shrink-0 rotate-0 opacity-40 transition-transform']" @click.prevent />
      </AuthRequiredPopover>

      <UButton v-else type="button" color="neutral" variant="ghost" size="md" square icon="i-lucide-chevron-right"
        :aria-label="sidePanelOpen ? 'Закрыть панель' : 'Открыть панель'" :aria-expanded="sidePanelOpen"
        :class="['shrink-0', sidePanelOpen ? 'rotate-180' : 'rotate-0', 'transition-transform']"
        @click="toggleSidePanel" />

      <UInput v-model="searchQuery" type="search" size="md" color="neutral" icon="i-lucide-search" placeholder="Поиск"
        aria-label="Поиск" autocomplete="off" class="w-full max-w-[450px] shrink-0" :ui="{
          base: 'rounded-xl ring-0 ring-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0',
        }" />

      <AuthRequiredPopover v-if="!isAuth" feature="Чат">
        <UButton color="neutral" variant="outline" size="md" icon="i-lucide-message-circle-question" label="Ask chat"
          aria-label="Ask chat" class="shrink-0 rounded-xl opacity-40" @click.prevent />
      </AuthRequiredPopover>

      <UButton v-else color="neutral" variant="outline" size="md" icon="i-lucide-message-circle-question" label="Ask chat"
        aria-label="Ask chat" class="shrink-0 rounded-xl" @click="handleAsk" />
    </div>

    <!-- Правая группа -->
    <div class="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
      <UButton color="neutral" variant="ghost" size="md" icon="i-lucide-bell" square aria-label="Уведомления"
        title="Уведомления" @click="handleNotifications" />

      <UButton type="button" color="primary" variant="solid" size="md" icon="i-lucide-plus" label="Добавить"
        class="rounded-xl" @click="openModal" />
    </div>
  </header>
</template>

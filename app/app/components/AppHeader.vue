<script setup lang="ts">
/**
 * Верхняя панель (область `header` в grid-template-areas).
 * Поиск по сайту (`AppSearch`), «AI чат» и кнопка руководства.
 * Все контролы — компоненты Nuxt UI (`UInput`, `UButton`), иконки — i-lucide-*.
 */

const { openModal } = useAddModal()
const { open: sidePanelOpen, toggleSidePanel } = useSidePanel()
const { isAuth } = useAuth()
const { canUseAi, key: aiKey } = useAiKey()
const { openModal: openKeyModal } = useAiKeyModal()
const { openModal: openAuthModal } = useAuthModal()

/** Ключ введён — кнопка ключа подсвечивается. */
const hasAiKey = computed<boolean>(() => aiKey.value.length > 0)

function handleAsk(): void {
  navigateTo('/chat')
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

      <!-- Поиск по сайту: страницы, руководство и действия -->
      <AppSearch />

      <AiFeaturePopover v-if="!canUseAi" feature="AI чат">
        <UButton color="neutral" variant="outline" size="md" icon="i-lucide-message-circle-question" label="AI чат"
          aria-label="AI чат" class="shrink-0 rounded-xl opacity-40" @click.prevent />
      </AiFeaturePopover>

      <UButton v-else color="neutral" variant="outline" size="md" icon="i-lucide-message-circle-question" label="AI чат"
        aria-label="AI чат" class="shrink-0 rounded-xl" @click="handleAsk" />
    </div>

    <!-- Правая группа: премиум, уведомления, свой ключ, добавить (только после входа) -->
    <div v-if="isAuth" class="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
      <AppPremiumButton />

      <!-- Руководство вместо уведомлений: открывает страницу с инструкцией -->
      <UButton
        to="/manual"
        color="neutral"
        variant="ghost"
        size="md"
        icon="i-lucide-circle-question-mark"
        square
        aria-label="Руководство по работе с сервисом"
        title="Руководство"
      />

      <!-- Ключ OpenRouter: круглая кнопка на акцентном фоне, открывает модалку ключа -->
      <UButton
        type="button"
        color="primary"
        variant="solid"
        size="md"
        icon="i-lucide-key-round"
        square
        class="shrink-0 rounded-full"
        :aria-label="hasAiKey ? 'Свой ключ OpenRouter (задан)' : 'Добавить ключ OpenRouter'"
        :title="hasAiKey ? 'Свой ключ сохранён' : 'Добавить свой ключ OpenRouter'"
        @click="openKeyModal"
      />

      <UButton type="button" color="primary" variant="solid" size="md" icon="i-lucide-plus" label="Добавить"
        class="rounded-xl" @click="openModal" />
    </div>

    <!-- Гость: только вход -->
    <div v-else class="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
      <UButton type="button" color="primary" variant="solid" size="md" icon="i-lucide-log-in" label="Войти"
        class="rounded-xl" @click="openAuthModal" />
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * Мобильное меню: выезжающая шторка с сайдбаром навигации.
 * Работает только до брейкпоинта `sm`; на десктопе сайдбар — постоянная рейка.
 */
const { open, closeMenu } = useMobileMenu()
const route = useRoute()

// Закрываем шторку при переходе по ссылке.
watch(
  () => route.path,
  () => closeMenu(),
)

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))

onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="sm:hidden">
    <!-- Затемнение -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        @click="closeMenu"
      />
    </Transition>

    <!-- Шторка -->
    <Transition
      enter-active-class="transition-transform duration-250 ease-out"
      enter-from-class="translate-x-full"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="open"
        class="fixed inset-y-0 right-0 z-50 w-16 bg-surface shadow-xl"
        role="dialog"
        aria-label="Меню"
        aria-modal="true"
      >
        <AppSidebar class="h-full border-r-0" />
      </div>
    </Transition>
  </div>
</template>

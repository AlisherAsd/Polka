<script setup lang="ts">
/**
 * Кнопка профиля внизу сайдбара.
 *
 * Авторизован — кружок с первой буквой email на синем фоне, по клику модалка
 * профиля. Гость — прежняя нейтральная иконка, открывающая вход.
 */
const { isAuth, user } = useAuth()
const { openModal: openAuthModal } = useAuthModal()
const { openModal: openProfileModal } = useProfileModal()

const initial = computed<string>(() => (user.value?.email ?? '').trim().charAt(0).toUpperCase() || '?')

function handleClick(): void {
  if (isAuth.value) {
    openProfileModal()

    return
  }

  openAuthModal()
}
</script>

<template>
  <button
    v-if="isAuth"
    type="button"
    class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white transition-opacity hover:opacity-90"
    :aria-label="`Профиль ${user?.email ?? ''}`"
    :title="user?.email ?? 'Профиль'"
    @click="handleClick"
  >
    {{ initial }}
  </button>

  <UButton
    v-else
    type="button"
    color="neutral"
    variant="outline"
    size="sm"
    icon="i-lucide-user"
    square
    class="rounded-full"
    aria-label="Профиль"
    title="Профиль"
    @click="handleClick"
  />
</template>

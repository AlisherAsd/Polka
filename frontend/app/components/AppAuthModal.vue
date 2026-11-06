<script setup lang="ts">
/**
 * Модалка авторизации — только вёрстка, без бэкенда.
 * Минимальный вариант: переключатель режима, два поля, кнопка.
 */
const { open, closeModal } = useAuthModal()
const { signIn } = useAuth()

const isLogin = ref<boolean>(true)
const email = ref<string>('')
const password = ref<string>('')

const title = computed<string>(() => (isLogin.value ? 'Вход' : 'Регистрация'))

function toggleMode(): void {
  isLogin.value = !isLogin.value
}

function submit(): void {
  // Бэкенда нет: вход/регистрация просто поднимают мок-флаг авторизации.
  signIn()
  closeModal()
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div class="flex flex-col gap-3">
        <UInput
          v-model="email"
          type="email"
          size="md"
          icon="i-lucide-mail"
          placeholder="Email"
          autocomplete="email"
          class="w-full"
        />

        <UInput
          v-model="password"
          type="password"
          size="md"
          icon="i-lucide-lock"
          placeholder="Пароль"
          :autocomplete="isLogin ? 'current-password' : 'new-password'"
          class="w-full"
        />

        <UButton
          type="button"
          color="neutral"
          variant="link"
          size="xs"
          class="self-start"
          :label="isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'"
          @click="toggleMode"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="md"
          label="Отмена"
          class="rounded-xl"
          @click="closeModal"
        />
        <UButton
          type="button"
          color="primary"
          variant="solid"
          size="md"
          :label="isLogin ? 'Войти' : 'Создать аккаунт'"
          class="rounded-xl px-6"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>

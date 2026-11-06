<script setup lang="ts">
/**
 * Модалка входа и регистрации: реальные запросы к `/api/auth/*`.
 * Успех — тост и закрытие окна; ошибка сервера показывается текстом и тостом.
 */
const { open, closeModal } = useAuthModal()
const { signInRequest } = useAuth()
const notify = useNotify()

const isLogin = ref<boolean>(true)
const email = ref<string>('')
const password = ref<string>('')
const pending = ref<boolean>(false)
const failure = ref<string>('')

const title = computed<string>(() => (isLogin.value ? 'Вход' : 'Регистрация'))

function toggleMode(): void {
  isLogin.value = !isLogin.value
  failure.value = ''
}

async function submit(): Promise<void> {
  if (pending.value) {
    return
  }

  pending.value = true
  failure.value = ''

  try {
    const user = await signInRequest(
      isLogin.value ? '/api/auth/login' : '/api/auth/register',
      email.value.trim(),
      password.value,
    )

    notify.success(isLogin.value ? `С возвращением, ${user.email}` : 'Аккаунт создан')
    password.value = ''
    closeModal()
  } catch (error) {
    failure.value = notify.messageOf(error, 'Не удалось войти')
    notify.fail(error, 'Не удалось войти')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :ui="{ content: 'sm:max-w-md' }">
    <template #body>
      <form class="flex flex-col gap-3" @submit.prevent="submit">
        <UInput
          v-model="email"
          type="email"
          size="md"
          icon="i-lucide-mail"
          placeholder="Email"
          autocomplete="email"
          class="w-full"
          :ui="{ base: 'rounded-xl' }"
        />

        <UInput
          v-model="password"
          type="password"
          size="md"
          icon="i-lucide-lock"
          placeholder="Пароль"
          :autocomplete="isLogin ? 'current-password' : 'new-password'"
          class="w-full"
          :ui="{ base: 'rounded-xl' }"
        />

        <p v-if="!isLogin" class="text-xs text-mute">Минимум 8 символов.</p>

        <p v-if="failure" class="text-xs text-[#b3261e]" role="alert">{{ failure }}</p>

        <UButton
          type="submit"
          color="primary"
          variant="solid"
          size="md"
          :loading="pending"
          :disabled="pending || email.trim().length === 0 || password.length === 0"
          :label="isLogin ? 'Войти' : 'Зарегистрироваться'"
          class="rounded-xl"
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
      </form>
    </template>
  </UModal>
</template>

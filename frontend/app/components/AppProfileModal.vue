<script setup lang="ts">
/**
 * Модалка профиля: аватар, статус премиума, свой ключ (скрыт, можно скопировать),
 * email и выход из аккаунта.
 */
const { open, closeModal } = useProfileModal()
const { user, signOut, isAuth } = useAuth()
const { isPremium, maskedKey, key: aiKey } = useAiKey()
const { openModal: openPremiumModal } = usePremiumModal()
const { openModal: openKeyModal } = useAiKeyModal()
const notify = useNotify()

const initial = computed<string>(() => (user.value?.email ?? '').trim().charAt(0).toUpperCase() || '?')
const revealed = ref<boolean>(false)
const copied = ref<boolean>(false)
const pending = ref<boolean>(false)

/** Ключ прикрыт по умолчанию; показываем полностью только по кнопке. */
const keyLabel = computed<string>(() => {
  if (!aiKey.value) {
    return ''
  }

  return revealed.value ? aiKey.value : maskedKey.value
})

async function copyKey(): Promise<void> {
  if (!aiKey.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(aiKey.value)
    copied.value = true
    notify.success('Ключ скопирован')
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    notify.error('Не удалось скопировать ключ')
  }
}

async function logout(): Promise<void> {
  if (pending.value) {
    return
  }

  pending.value = true

  try {
    await signOut()
    notify.success('Вы вышли из аккаунта')
    closeModal()
  } catch (error) {
    notify.fail(error, 'Не удалось выйти')
  } finally {
    pending.value = false
  }
}

/** Переход в модалку премиума (для не-премиумов). */
function goPremium(): void {
  if (isPremium.value) {
    return
  }

  closeModal()
  openPremiumModal()
}

/** Переход в модалку ключа, когда ключа нет. */
function goKey(): void {
  closeModal()
  openKeyModal()
}

watch(open, (isOpen) => {
  if (isOpen) {
    revealed.value = false
    copied.value = false
  }
})
</script>

<template>
  <UModal v-model:open="open" title="Профиль" :ui="{ content: 'sm:max-w-md' }">
    <template #body>
      <div v-if="!isAuth" class="text-sm text-dim">Вы не вошли в аккаунт.</div>

      <div v-else class="flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <span
            class="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white"
            aria-hidden="true"
          >
            {{ initial }}
          </span>
          <div class="flex min-w-0 flex-col">
            <span class="truncate text-sm font-semibold text-ink">{{ user?.email }}</span>
            <span class="text-[11px] text-mute">{{ isPremium ? 'премиум' : 'бесплатный аккаунт' }}</span>
          </div>
        </div>

        <!-- Премиум -->
        <button
          type="button"
          class="flex items-center gap-1.5 self-start text-[11px] text-dim transition-colors hover:text-ink"
          @click="goPremium"
        >
          <UIcon
            name="i-lucide-crown"
            class="size-3.5"
            :class="isPremium ? 'text-primary' : 'text-mute'"
          />
          <span>{{ isPremium ? 'Премиум активен' : 'Оформить премиум' }}</span>
        </button>

        <!-- Ключ OpenRouter -->
        <div class="flex flex-col gap-1">
          <p class="text-[11px] uppercase tracking-wide text-mute">Ключ OpenRouter</p>

          <div v-if="aiKey" class="flex items-center gap-2">
            <span class="min-w-0 flex-1 truncate font-mono text-[11px] text-dim">{{ keyLabel }}</span>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="xs"
              :icon="revealed ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              square
              :aria-label="revealed ? 'Скрыть ключ' : 'Показать ключ'"
              @click="revealed = !revealed"
            />
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="xs"
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              square
              aria-label="Скопировать ключ"
              @click="copyKey"
            />
          </div>

          <button
            v-else
            type="button"
            class="self-start text-[11px] text-dim underline transition-colors hover:text-ink"
            @click="goKey"
          >
            Добавить свой ключ
          </button>
        </div>

        <!-- Email -->
        <div class="flex flex-col gap-1">
          <p class="text-[11px] uppercase tracking-wide text-mute">Email</p>
          <p class="truncate text-sm text-ink">{{ user?.email }}</p>
        </div>
      </div>
    </template>

    <template v-if="isAuth" #footer>
      <div class="flex w-full justify-end">
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          size="md"
          icon="i-lucide-log-out"
          label="Выйти"
          class="rounded-xl"
          :loading="pending"
          @click="logout"
        />
      </div>
    </template>
  </UModal>
</template>

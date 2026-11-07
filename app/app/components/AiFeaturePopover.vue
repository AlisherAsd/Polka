<script setup lang="ts">
/**
 * Подсказка у функций ИИ, когда доступа нет: «свой ключ или премиум».
 * Аналог `AuthRequiredPopover`, но про доступ к модели.
 */
withDefaults(
  defineProps<{
    /** Что именно заблокировано: «Саммари», «AI чат». */
    feature?: string
  }>(),
  { feature: 'ИИ' },
)

const { canUseAi } = useAiKey()
const { openModal: openKeyModal } = useAiKeyModal()
const { openModal: openPremiumModal } = usePremiumModal()
const { openModal: openAuthModal } = useAuthModal()
const { isAuth } = useAuth()

const isOpen = ref<boolean>(false)

function handleOpen(value: boolean): void {
  isOpen.value = value && !canUseAi.value
}

/** Без аккаунта сначала вход: ключ и премиум привязаны к пользователю. */
function requireAuth(): boolean {
  if (isAuth.value) {
    return false
  }

  isOpen.value = false
  openAuthModal()

  return true
}

function openKey(): void {
  if (requireAuth()) {
    return
  }

  isOpen.value = false
  openKeyModal()
}

function openPremium(): void {
  if (requireAuth()) {
    return
  }

  isOpen.value = false
  openPremiumModal()
}
</script>

<template>
  <UPopover
    :open="isOpen"
    mode="hover"
    :content="{ side: 'bottom', sideOffset: 8, align: 'center' }"
    arrow
    @update:open="handleOpen"
  >
    <slot />

    <template #content>
      <div class="flex w-64 flex-col gap-2 p-3">
        <!-- Не авторизован: сначала вход -->
        <template v-if="!isAuth">
          <p class="text-sm font-semibold text-ink">Нужен вход</p>
          <p class="text-xs leading-snug text-dim">
            {{ feature }} доступно после входа в аккаунт: затем можно указать свой ключ
            OpenRouter или оформить премиум.
          </p>
          <UButton
            type="button"
            color="primary"
            variant="solid"
            size="xs"
            label="Войти"
            class="self-start rounded-lg px-3"
            @click="requireAuth"
          />
        </template>

        <!-- Авторизован, но доступа к ИИ нет -->
        <template v-else>
          <p class="text-sm font-semibold text-ink">{{ feature }} недоступно</p>
          <p class="text-xs leading-snug text-dim">
            Укажите свой ключ OpenRouter или оформите премиум — тогда запросы пойдут через сервер.
          </p>

          <div class="flex flex-wrap gap-2">
            <UButton
              type="button"
              color="primary"
              variant="solid"
              size="xs"
              icon="i-lucide-key-round"
              label="Свой ключ"
              class="rounded-lg px-3"
              @click="openKey"
            />
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              size="xs"
              icon="i-lucide-crown"
              label="Премиум"
              class="rounded-lg px-3"
              @click="openPremium"
            />
          </div>
        </template>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
/**
 * Модалка премиума: объясняет, что ключ покупать не нужно,
 * и предлагает «Купить» / «Отмена».
 *
 * Покупки пока нет: «Купить» включает флаг `is_premium` на сервере
 * (`POST /api/auth/premium`), после этого ИИ работает серверным ключом.
 */
const { open, closeModal } = usePremiumModal()
const { isPremium, pending, buyPremium } = useAiKey()
const { isAuth } = useAuth()
const { openModal: openAuthModal } = useAuthModal()
const { openModal: openKeyModal } = useAiKeyModal()
const notify = useNotify()

async function handleBuy(): Promise<void> {
  if (!isAuth.value) {
    closeModal()
    openAuthModal()

    return
  }

  try {
    await buyPremium()
    closeModal()
  } catch (error) {
    notify.fail(error, 'Не удалось включить премиум')
  }
}

function handleKey(): void {
  closeModal()
  openKeyModal()
}
</script>

<template>
  <UModal v-model:open="open" title="Премиум" :ui="{ content: 'sm:max-w-md' }">
    <template #body>
      <div class="flex flex-col gap-3">
        <p class="text-sm leading-snug text-ink">
          С премиумом ключ OpenRouter покупать не нужно: запросы к модели идут
          через сервер Полки.
        </p>

        <ul class="flex flex-col gap-1 text-xs leading-snug text-dim">
          <li>· Саммари карточек и файлов</li>
          <li>· AI-чат по вашим материалам</li>
          <li>· Свой ключ не нужен — ничего настраивать не придётся</li>
        </ul>

        <p v-if="isPremium" class="rounded-xl bg-[#eef7ee] px-3 py-2 text-xs text-[#1e5b2a]">
          Премиум уже активен.
        </p>

        <p v-else-if="!isAuth" class="text-xs text-mute">
          Для покупки нужно войти в аккаунт.
        </p>

        <p class="text-xs text-mute">
          Уже есть свой ключ?
          <button type="button" class="underline" @click="handleKey">Ввести ключ</button>
        </p>
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
          v-if="!isPremium"
          type="button"
          color="primary"
          variant="solid"
          size="md"
          icon="i-lucide-crown"
          label="Купить"
          class="rounded-xl px-5"
          :loading="pending"
          :disabled="pending"
          @click="handleBuy"
        />
      </div>
    </template>
  </UModal>
</template>

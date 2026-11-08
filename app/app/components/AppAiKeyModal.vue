<script setup lang="ts">
/**
 * Модалка личного ключа OpenRouter. Ключ проверяется на сервере
 * (`POST /api/auth/key`) и хранится только в localStorage устройства.
 */
const { open, closeModal } = useAiKeyModal()
const { key: storedKey, maskedKey, isPremium, saveKey, removeKey } = useAiKey()
const premiumActive = isFeaturePremiumActive()
const notify = useNotify()

const value = ref<string>('')
const pending = ref<boolean>(false)
const failure = ref<string>('')

watch(open, (isOpen) => {
  if (isOpen) {
    value.value = ''
    failure.value = ''
  }
})

async function submit(): Promise<void> {
  if (pending.value || value.value.trim().length === 0) {
    return
  }

  pending.value = true
  failure.value = ''

  try {
    await saveKey(value.value)
    value.value = ''
    closeModal()
  } catch (error) {
    failure.value = notify.messageOf(error, 'Ключ не принят')
    notify.fail(error, 'Ключ не принят')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Доступ к ИИ" :ui="{ content: 'sm:max-w-md' }">
    <template #body>
      <div class="flex flex-col gap-4">
        <p
          v-if="premiumActive && isPremium"
          class="rounded-xl bg-[#eef7ee] px-3 py-2 text-xs leading-snug text-[#1e5b2a]"
        >
          У вас премиум: запросы к модели идут через сервер Полки, свой ключ не нужен.
        </p>

        <div class="flex flex-col gap-2">
          <p class="text-sm font-semibold text-ink">Свой ключ OpenRouter</p>
          <p class="text-xs leading-snug text-dim">
            Ключ хранится только в этом браузере и отправляется на сервер лишь в момент запроса.
            Получить его можно в OpenRouter → Keys.
          </p>

          <p v-if="storedKey" class="text-xs text-dim">
            Сохранён: <span class="font-mono">{{ maskedKey }}</span>
          </p>

          <form class="flex gap-2" @submit.prevent="submit">
            <UInput
              v-model="value"
              type="password"
              size="md"
              placeholder="sk-or-v1-…"
              autocomplete="off"
              class="w-full"
              :ui="{ base: 'rounded-xl font-mono text-xs' }"
            />
            <UButton
              type="submit"
              color="primary"
              variant="solid"
              size="md"
              label="Сохранить"
              class="shrink-0 rounded-xl"
              :loading="pending"
              :disabled="pending || value.trim().length === 0"
            />
          </form>

          <div v-if="storedKey" class="flex justify-start">
            <UButton
              type="button"
              color="neutral"
              variant="link"
              size="xs"
              label="Удалить ключ с устройства"
              @click="removeKey"
            />
          </div>

          <p v-if="failure" class="text-xs text-[#b3261e]" role="alert">{{ failure }}</p>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * Модалка подтверждения (замена `window.confirm`, которого нет в Tauri).
 * Монтируется в дефолтном лейауте и в страницах без лейаута.
 */
const { state, answer } = useConfirm()

/** Значение поля ввода (когда спрашиваем строку). */
const value = ref<string>('')

watch(
  () => state.value.open,
  (open) => {
    if (open) {
      value.value = ''
    }
  },
)

/** Подтверждение: строка (если спрашивали) или `true`. */
function submit(): void {
  const trimmed = value.value.trim()

  if (state.value.input && trimmed.length === 0) {
    return
  }

  answer(state.value.input ? trimmed : true)
}
</script>

<template>
  <UModal
    :open="state.open"
    :title="state.title"
    :ui="{ content: 'sm:max-w-md' }"
    @update:open="(value: boolean) => { if (!value) answer(false) }"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <p v-if="state.description" class="text-sm leading-snug text-dim">{{ state.description }}</p>

        <UInput
          v-if="state.input"
          v-model="value"
          size="md"
          :placeholder="state.input"
          class="w-full"
          :ui="{ base: 'rounded-xl' }"
          autofocus
          @keydown.enter.prevent="submit"
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
          @click="answer(false)"
        />
        <UButton
          type="button"
          :color="state.danger ? 'error' : 'primary'"
          variant="solid"
          size="md"
          :label="state.confirmLabel"
          class="rounded-xl px-5"
          :disabled="Boolean(state.input) && value.trim().length === 0"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>

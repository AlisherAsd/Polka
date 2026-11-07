<script setup lang="ts">
/**
 * Модалка подтверждения (замена `window.confirm`, которого нет в Tauri).
 * Монтируется в дефолтном лейауте и в страницах без лейаута.
 */
const { state, answer } = useConfirm()
</script>

<template>
  <UModal
    :open="state.open"
    :title="state.title"
    :ui="{ content: 'sm:max-w-md' }"
    @update:open="(value: boolean) => { if (!value) answer(false) }"
  >
    <template #body>
      <p v-if="state.description" class="text-sm leading-snug text-dim">{{ state.description }}</p>
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
          @click="answer(true)"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const { open, closeModal } = useAddModal()
const { loading, addLink } = useCards()

const formRef = ref<{ handleSubmit: () => void } | null>(null)

async function handleSubmit(url: string): Promise<void> {
  await addLink(url)
  closeModal()
}

function submitFromFooter(): void {
  formRef.value?.handleSubmit()
}
</script>

<template>
  <UModal v-model:open="open" title="Добавить ссылку">
    <template #body>
      <AddCardForm
        ref="formRef"
        :loading="loading"
        :hide-button="true"
        @submit="handleSubmit"
      />
    </template>

    <template #footer>
      <div class="flex w-full justify-end">
        <UButton
          type="button"
          color="primary"
          variant="solid"
          size="md"
          icon="i-lucide-plus"
          :loading="loading"
          :disabled="loading"
          class="rounded-xl px-5"
          :label="loading ? 'Добавляем…' : 'Добавить'"
          @click="submitFromFooter"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * Пустое состояние: картинка, заголовок, пояснение и действие.
 * Картинка — готовый SVG из `public/`.
 */
withDefaults(
  defineProps<{
    title: string
    description?: string
    /** Иконка/картинка из `public/`. */
    image?: string
    /** Подпись кнопки действия; без неё кнопка не рендерится. */
    actionLabel?: string
  }>(),
  {
    description: '',
    image: '/open-box.svg',
    actionLabel: '',
  },
)

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
    <img
      :src="image"
      alt=""
      aria-hidden="true"
      class="h-40 w-40 opacity-50 select-none sm:h-48 sm:w-48"
      draggable="false"
    />

    <h2 class="text-xl font-semibold text-ink sm:text-2xl">{{ title }}</h2>

    <p v-if="description" class="max-w-sm text-sm leading-relaxed text-dim">
      {{ description }}
    </p>

    <UButton
      v-if="actionLabel"
      type="button"
      color="primary"
      variant="solid"
      size="md"
      icon="i-lucide-plus"
      :label="actionLabel"
      class="mt-2 rounded-xl !px-6"
      @click="emit('action')"
    />
  </div>
</template>

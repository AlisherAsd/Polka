<script setup lang="ts">
/**
 * Popover-подсказка о необходимости входа.
 * Показывается при наведении на заблокированный элемент.
 */
const props = withDefaults(
  defineProps<{
    /** Что именно заблокировано: «чат», «папки», «доска». */
    feature?: string
    /** Показывать только для неавторизованных. */
    active?: boolean
  }>(),
  { feature: 'эта функция', active: true },
)

const { openModal } = useAuthModal()

const isOpen = ref<boolean>(false)

function handleOpen(value: boolean): void {
  isOpen.value = value && props.active
}

function signIn(): void {
  isOpen.value = false
  openModal()
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
      <div class="flex w-60 flex-col gap-2 p-3">
        <p class="text-sm font-semibold text-ink">Нужен вход</p>
        <p class="text-xs leading-snug text-dim">
          {{ feature }} доступн{{ feature === 'чат' ? 'о' : 'ы' }} только после
          входа в аккаунт.
        </p>
        <UButton
          type="button"
          color="primary"
          variant="solid"
          size="xs"
          label="Войти"
          class="self-start rounded-lg px-3"
          @click="signIn"
        />
      </div>
    </template>
  </UPopover>
</template>

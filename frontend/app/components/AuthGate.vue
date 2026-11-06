<script setup lang="ts">
/**
 * Блок функций для неавторизованных: объяснение и кнопка входа.
 *
 * Используется вместо содержимого страницы (карточки, доска, чат, файлы),
 * чтобы гость не видел данные и не запускал действия до входа.
 */
const props = withDefaults(
  defineProps<{
    /** Что именно закрыто: «Карточки», «Доска», «Чат». */
    feature?: string
    /** Свой заголовок вместо «Нужен вход». */
    title?: string
    /** Своё описание вместо шаблонного. */
    description?: string
    /** Компактный вид (для панелей и модалок). */
    compact?: boolean
  }>(),
  {
    feature: 'Функции',
    title: '',
    description: '',
    compact: false,
  },
)

const { openModal: openAuthModal } = useAuthModal()

const heading = computed<string>(() => props.title || 'Нужен вход')
const text = computed<string>(() => props.description || `${props.feature} доступны после входа в аккаунт.`)
</script>

<template>
  <div
    class="flex flex-col items-center gap-3 text-center"
    :class="compact
      ? 'px-3 py-4'
      : 'm-auto max-w-md rounded-2xl border border-line bg-surface px-6 py-8'"
  >
    <UIcon name="i-lucide-lock" class="text-mute" :class="compact ? 'size-5' : 'size-6'" />
    <p class="font-semibold text-ink" :class="compact ? 'text-xs' : 'text-sm'">{{ heading }}</p>
    <p class="leading-snug text-dim" :class="compact ? 'text-[11px]' : 'text-xs'">{{ text }}</p>
    <UButton
      type="button"
      color="primary"
      variant="solid"
      :size="compact ? 'xs' : 'md'"
      label="Войти"
      :class="compact ? 'rounded-lg px-3' : 'rounded-xl px-6'"
      @click="openAuthModal"
    />
  </div>
</template>

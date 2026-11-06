<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Не даёт повторно отправить форму, пока идёт загрузка ссылки. */
    loading?: boolean
    /** Скрывает встроенную кнопку — submit вызывает внешний футер через `handleSubmit`. */
    hideButton?: boolean
  }>(),
  { loading: false, hideButton: false },
)

const emit = defineEmits<{
  submit: [url: string]
}>()

const value = ref<string>('')
const error = ref<string>('')
/** Ошибку показываем только после первой попытки отправки или после ввода. */
const touched = ref<boolean>(false)

const isValid = computed<boolean>(() => validate(value.value).valid)

/**
 * Валидация: пустое поле и невалидный URL отклоняются.
 * Схема необязательна — `youtube.com/watch?v=...` считается корректной ссылкой,
 * нормализация (добавление `https://`) выполняется перед парсингом.
 */
function validate(raw: string): { valid: boolean; message: string } {
  const trimmed = raw.trim()

  if (trimmed.length === 0) {
    return { valid: false, message: 'Вставьте ссылку' }
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  let parsed: URL

  try {
    parsed = new URL(withProtocol)
  } catch {
    return { valid: false, message: 'Некорректная ссылка' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, message: 'Поддерживаются только http(s)-ссылки' }
  }

  // Хост из одних цифр (например, `12345`) — это не домен.
  const host = parsed.hostname

  if (!host.includes('.') || /^\d+$/.test(host)) {
    return { valid: false, message: 'Похоже, это не адрес сайта' }
  }

  return { valid: true, message: '' }
}

function handleSubmit(): void {
  touched.value = true

  const result = validate(value.value)

  if (!result.valid) {
    error.value = result.message

    return
  }

  error.value = ''
  emit('submit', value.value.trim())
  value.value = ''
  touched.value = false
}

function handleInput(event: Event): void {
  const target = event.target

  if (target instanceof HTMLInputElement) {
    value.value = target.value
  }

  if (touched.value) {
    error.value = validate(value.value).message
  }
}

/** Внешняя кнопка (футер модалки) вызывает submit напрямую. */
defineExpose({ handleSubmit })
</script>

<template>
  <form
    class="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <div
      class="flex min-w-0 flex-1 flex-col gap-1"
      :aria-invalid="Boolean(error)"
    >
      <UInput
        id="link-input"
        v-model="value"
        type="url"
        size="md"
        icon="i-lucide-link"
        inputmode="url"
        autocomplete="off"
        spellcheck="false"
        placeholder="Вставьте ссылку: YouTube, TikTok, Telegram или статья"
        aria-describedby="link-error"
        color="neutral"
        class="w-full"
        :ui="{
          base: 'rounded-xl ring-0 ring-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0',
        }"
        @input="handleInput"
        @keydown.enter.prevent="handleSubmit"
      />
      <p
        v-if="error"
        id="link-error"
        role="alert"
        class="px-1 text-xs font-medium text-error"
      >
        {{ error }}
      </p>
    </div>

    <UButton
      v-if="!props.hideButton"
      type="submit"
      color="primary"
      variant="solid"
      size="md"
      icon="i-lucide-plus"
      :loading="props.loading"
      :disabled="props.loading || value.trim().length === 0"
      class="shrink-0 justify-center rounded-xl px-5"
      :label="props.loading ? 'Добавляем…' : 'Добавить'"
    />
  </form>
</template>

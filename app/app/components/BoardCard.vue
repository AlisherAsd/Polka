<script setup lang="ts">
/**
 * Карточка доски на главной: та же сетка и форма, что у карточек items,
 * но вместо превью — заглушка под будущую кастомную картинку доски.
 */
const props = defineProps<{
  title: string
  /** Куда ведёт карточка: своя доска или публичная ссылка. */
  to: string
  /** Заметок в папке. */
  files: number
  /** Ссылка на превью доски; пусто — заглушка. */
  preview?: string | null
  /** Публичная доска: показываем глобус и автора. */
  isPublic?: boolean
  /** Автор (для публичной ленты). */
  author?: string | null
}>()

const previewFailed = ref<boolean>(false)

watch(
  () => props.preview,
  () => {
    previewFailed.value = false
  },
)

const showPreview = computed<boolean>(
  () => Boolean(props.preview) && !previewFailed.value,
)

const authorInitial = computed<string>(() => {
  const email = props.author?.trim() ?? ''

  return email.length > 0 ? email[0]!.toUpperCase() : '?'
})

const filesLabel = computed<string>(() => {
  const n = props.files

  if (n === 0) {
    return 'пусто'
  }

  return `${n} ${n === 1 ? 'файл' : n < 5 ? 'файла' : 'файлов'}`
})
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
  >
    <!-- Заглушка вместо кастомной обложки доски -->
    <div class="relative aspect-video w-full overflow-hidden bg-[#ededed]">
      <img
        v-if="showPreview"
        :src="preview ?? undefined"
        :alt="title"
        loading="lazy"
        class="h-full w-full object-cover"
        @error="previewFailed = true"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,#f7f4ef,transparent_55%),linear-gradient(135deg,#f1ede6,#e4dfd6)]"
      >
        <UIcon name="i-lucide-columns-3" class="size-10 text-mute/70" />
      </div>

      <span
        v-if="isPublic"
        class="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
        title="Публичная доска"
      >
        <UIcon name="i-lucide-globe" class="size-3.5" />
      </span>
    </div>

    <div class="flex flex-1 flex-col gap-1 p-2">
      <p class="line-clamp-2 text-[13px] font-semibold leading-snug text-ink" :title="title">
        {{ title }}
      </p>

      <!-- Автор доски: кружок с буквой и email -->
      <div v-if="isPublic && author" class="flex min-w-0 items-center gap-1.5">
        <span
          class="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-semibold uppercase leading-none text-white"
          aria-hidden="true"
        >
          {{ authorInitial }}
        </span>
        <span class="truncate text-[11px] leading-none text-mute" :title="author">{{ author }}</span>
      </div>

      <div class="mt-auto flex items-center justify-between gap-2 pt-0.5 text-[11px] text-mute">
        <span class="truncate">{{ filesLabel }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

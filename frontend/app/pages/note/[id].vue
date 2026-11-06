<script setup lang="ts">
import { ref } from 'vue'
import MarkdownIt from 'markdown-it'
import { findNote } from '~/data/notes'

/**
 * Страница заметки: markdown редактируется и рендерится на клиенте.
 * Сохраняется только в памяти страницы — в бэкенд (`/api/items`) не пишется.
 */
const route = useRoute()

const noteId = computed<string>(() => String(route.params.id ?? ''))
const note = computed(() => findNote(noteId.value))

/** Текущий markdown. Заполняется сразу из мока, чтобы содержимое попало в SSR. */
const source = ref<string>(note.value?.content ?? '')
const title = ref<string>(note.value?.title ?? '')
const isEditing = ref<boolean>(false)

/** Текст, с которого начали редактирование — для «Отменить». */
let snapshot = source.value

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

const html = computed<string>(() => (source.value ? md.render(source.value) : ''))

const isDirty = computed<boolean>(() => source.value !== snapshot)

function startEditing(): void {
  snapshot = source.value
  isEditing.value = true
}

function cancelEditing(): void {
  source.value = snapshot
  isEditing.value = false
}

function handleInput(event: Event): void {
  const target = event.target

  if (target instanceof HTMLTextAreaElement) {
    source.value = target.value
  }
}

useHead(() => ({
  title: note.value ? `${note.value.title} — Полка` : 'Заметка — Полка',
}))
</script>

<template>
  <section class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8">
    <template v-if="note">
      <header class="flex flex-col gap-1">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-1 text-xs text-mute hover:text-ink"
        >
          <UIcon name="i-lucide-arrow-left" class="size-3.5" />
          Назад
        </NuxtLink>

        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 flex-col gap-1">
            <h1 class="truncate text-2xl font-bold leading-tight text-ink sm:text-3xl">
              {{ title }}
            </h1>
            <p class="text-xs text-mute">
              Обновлено {{ note.updatedAt }}
              <span v-if="isDirty" class="text-primary-600">· не сохранено</span>
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <template v-if="isEditing">
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                size="sm"
                label="Отменить"
                class="rounded-lg"
                @click="cancelEditing"
              />
              <UButton
                type="button"
                color="primary"
                variant="solid"
                size="sm"
                icon="i-lucide-check"
                label="Готово"
                class="rounded-lg"
                @click="isEditing = false"
              />
            </template>

            <UButton
              v-else
              type="button"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-pencil"
              label="Изменить"
              class="rounded-lg"
              @click="startEditing"
            />
          </div>
        </div>
      </header>

      <!-- Режим редактирования: markdown-исходник -->
      <UTextarea
        v-if="isEditing"
        :model-value="source"
        :rows="20"
        autoresize
        spellcheck="false"
        placeholder="Пишите в markdown…"
        aria-label="Текст заметки"
        class="w-full font-mono text-sm"
        :ui="{ base: 'rounded-xl' }"
        @input="handleInput"
      />

      <!-- Просмотр: отрендеренный markdown -->
      <article
        v-else
        class="text-[15px] leading-relaxed text-ink [&_a]:text-primary-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-4 [&_blockquote]:text-dim [&_code]:rounded [&_code]:bg-app [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px] [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_hr]:my-6 [&_hr]:border-line [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-3 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-app [&_pre]:p-3 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-line [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-line [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5"
        v-html="html"
      />
    </template>

    <EmptyState
      v-else
      title="Заметка не найдена"
      description="Возможно, ссылка устарела или заметка удалена."
    />
  </section>
</template>

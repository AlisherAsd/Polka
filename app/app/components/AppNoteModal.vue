<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * Модалка «Новая заметка»: файл с нуля, без карточки.
 *
 * Раньше заметку можно было получить только из карточки («В папку») или
 * саммари. Здесь пользователь сам вводит название и текст и выбирает папку.
 */
const { open, closeModal } = useNoteModal()
const { folders, init, addNote } = useFiles()
const notify = useNotify()

const title = ref<string>('')
const content = ref<string>('')
const folderId = ref<string>('')
const saving = ref<boolean>(false)
const failure = ref<string>('')

const folderItems = computed(() =>
  folders.value.map((folder) => ({ label: folder.name, value: folder.id })),
)

/** По умолчанию — «Мои знания», если она есть в списке. */
const defaultFolderId = computed<string>(() => {
  const root = folders.value.find((folder) => folder.isRoot === true)

  return root?.id ?? folders.value[0]?.id ?? ''
})

watch(open, (value) => {
  if (!value) {
    return
  }

  title.value = ''
  content.value = ''
  failure.value = ''
  void init().then(() => {
    folderId.value = defaultFolderId.value
  })
})

function handleOpenChange(value: boolean): void {
  open.value = value
}

async function save(): Promise<void> {  if (saving.value) {
    return
  }

  const name = title.value.trim()
  const body = content.value.trim()
  const folder = folders.value.find((item) => item.id === folderId.value)

  if (name.length === 0) {
    failure.value = 'Укажите название заметки'

    return
  }

  if (body.length === 0) {
    failure.value = 'Добавьте текст заметки'

    return
  }

  if (!folder) {
    failure.value = 'Выберите папку'

    return
  }

  saving.value = true
  failure.value = ''

  try {
    await addNote({
      title: name,
      content: body,
      folderId: folder.id,
    })

    notify.success(`Заметка «${name}» создана`)
    closeModal()
  } catch (error) {
    failure.value = notify.messageOf(error, 'Не удалось создать заметку')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    title="Новая заметка"
    :ui="{ content: 'sm:max-w-xl' }"
    @update:open="handleOpenChange"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <UInput
          v-model="title"
          placeholder="Название"
          aria-label="Название заметки"
          class="w-full"
          autofocus
        />

        <UTextarea
          v-model="content"
          :rows="8"
          autoresize
          placeholder="Текст заметки…"
          aria-label="Текст заметки"
          class="w-full"
        />

        <div class="flex flex-col gap-1">
          <span class="text-xs text-mute">Папка</span>
          <USelect
            v-model="folderId"
            :items="folderItems"
            placeholder="Выберите папку"
            aria-label="Папка для заметки"
            class="w-full"
          />
        </div>

        <p v-if="failure" class="text-xs text-error" role="alert">{{ failure }}</p>
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
          @click="closeModal"
        />
        <UButton
          type="button"
          color="primary"
          variant="solid"
          size="md"
          icon="i-lucide-file-plus"
          label="Создать"
          class="rounded-xl px-5"
          :loading="saving"
          :disabled="saving"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>

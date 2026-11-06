<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * Модалка «В папку»: выбирает папку для выделенных карточек.
 * Список папок — реальный (`/api/folders`); если нужной нет, её можно создать.
 * Применение создаёт заметку с названием и описанием карточки.
 */
const { open, closeModal } = useFolderModal()
const { selectedIds, cards, clearSelection, setFolder } = useCards()
const { selectableFolders, init, reload, addNote, noteForItem } = useFiles()

/** Выбранная папка (id). */
const selectedFolderId = ref<string>('')
/** Название новой папки. */
const newFolderName = ref<string>('')
const creating = ref<boolean>(false)
const failure = ref<string>('')

const folders = computed(() => selectableFolders.value)

/** Название папки текущей выделенной карточки — значение по умолчанию. */
function currentFolder(): string {
  const first = cards.value.find((card) => selectedIds.value.includes(card.id))

  return first?.folderId ?? ''
}

function handleOpenChange(value: boolean): void {
  open.value = value

  if (value) {
    void init().then(() => {
      selectedFolderId.value = currentFolder()
    })
    failure.value = ''
    newFolderName.value = ''
  }
}

/** Создаёт папку и сразу выбирает её. */
async function createFolder(): Promise<void> {
  const name = newFolderName.value.trim()

  if (name.length === 0 || creating.value) {
    return
  }

  creating.value = true
  failure.value = ''

  try {
    const created = await $fetch<{ folder: { id: string } }>('/api/folders', {
      method: 'POST',
      body: { name },
    })

    await reload()
    selectedFolderId.value = created.folder.id
    newFolderName.value = ''
  } catch (error) {
    failure.value = (error as { data?: { message?: string } })?.data?.message ?? 'Не удалось создать папку'
  } finally {
    creating.value = false
  }
}

/**
 * Применяет папку: создаёт заметку (файл) в этой папке с названием карточки
 * и её описанием/ссылкой, либо переносит уже существующую заметку.
 */
async function apply(): Promise<void> {
  const folder = folders.value.find((item) => item.id === selectedFolderId.value)
  const ids = [...selectedIds.value]

  if (!folder || ids.length === 0 || creating.value) {
    closeModal()
    clearSelection()

    return
  }

  const targets = cards.value.filter((card) => ids.includes(card.id))

  setFolder(ids, folder.name, folder.id)

  try {
    for (const card of targets) {
      const existing = noteForItem(card.id)

      if (existing) {
        await $fetch(`/api/notes/${encodeURIComponent(existing.id)}`, {
          method: 'PATCH',
          body: { folderId: folder.id },
        })

        continue
      }

      const description = card.summary?.trim() || card.content?.trim() || 'Без описания'
      const content = card.url ? `${description}\n\nИсточник: ${card.url}` : description

      await addNote({
        title: card.title,
        content,
        folderId: folder.id,
        itemId: card.id,
        url: card.url ?? null,
      })
    }

    await reload()
  } catch (error) {
    failure.value = (error as { data?: { message?: string } })?.data?.message ?? 'Не удалось сохранить папку'
  } finally {
    closeModal()
    clearSelection()
  }
}
</script>

<template>
  <UModal :open="open" title="Переместить в папку" @update:open="handleOpenChange">
    <template #body>
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <UButton
            v-for="folder in folders"
            :key="folder.id"
            type="button"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-folder"
            :label="folder.name"
            class="w-full justify-start rounded-lg"
            :class="selectedFolderId === folder.id ? 'bg-app text-ink' : undefined"
            :aria-pressed="selectedFolderId === folder.id"
            @click="selectedFolderId = folder.id"
          />
        </div>

        <div class="flex items-center gap-2">
          <UInput
            v-model="newFolderName"
            placeholder="Новая папка"
            size="sm"
            class="flex-1"
            :ui="{ base: 'rounded-lg' }"
            @keydown.enter.prevent="createFolder"
          />
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-plus"
            label="Создать"
            class="rounded-lg"
            :loading="creating"
            :disabled="newFolderName.trim().length === 0"
            @click="createFolder"
          />
        </div>

        <p v-if="failure" class="text-xs text-[#b3261e]">{{ failure }}</p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="sm"
          label="Отмена"
          class="rounded-lg"
          @click="handleOpenChange(false)"
        />
        <UButton
          type="button"
          color="primary"
          variant="solid"
          size="sm"
          label="Переместить"
          class="rounded-lg"
          :disabled="selectedFolderId.length === 0"
          @click="apply"
        />
      </div>
    </template>
  </UModal>
</template>

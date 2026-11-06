import { computed, readonly, ref } from 'vue'
import type { Ref } from 'vue'
import { createNote, fetchFolders, fetchNotes } from '~/api/notes'
import type { Folder, Note } from '~/api/notes'
import { TREE_ROOT_ID, buildFileTree } from '~/utils/fileTree'
import type { FileNode } from '~/utils/fileTree'

/**
 * Папки и заметки базы знаний — единственный источник для второй панели.
 * Грузится с бэкенда один раз (общий промис), после изменений обновляется целиком.
 */
interface FilesState {
  folders: Ref<Folder[]>
  notes: Ref<Note[]>
  loading: Ref<boolean>
  error: Ref<string | null>
}

let sharedState: FilesState | null = null
let loadPromise: Promise<void> | null = null

function ensureState(): FilesState {
  if (!sharedState) {
    sharedState = {
      folders: ref<Folder[]>([]),
      notes: ref<Note[]>([]),
      loading: ref(false),
      error: ref<string | null>(null),
    }
  }

  return sharedState
}

/** Подсказка из ошибки `$fetch` с телом `{ message }`. */
function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { data?: { message?: unknown } })?.data?.message

  return typeof message === 'string' && message.length > 0 ? message : fallback
}

export function useFiles() {
  const state = ensureState()

  const folders = readonly(state.folders)
  const notes = readonly(state.notes)
  const loading = readonly(state.loading)
  const error = readonly(state.error)

  /** Дерево второй панели: папки и лежащие в них заметки. */
  const tree = computed<FileNode[]>(() => buildFileTree(state.folders.value, state.notes.value))

  /** Папки, доступные для выбора (без корневого узла). */
  const selectableFolders = computed<Folder[]>(() =>
    state.folders.value.filter((folder) => folder.id !== TREE_ROOT_ID),
  )

  /** Перезагружает папки и заметки с сервера. */
  async function reload(): Promise<void> {
    state.loading.value = true
    state.error.value = null

    try {
      const [folders, notes] = await Promise.all([fetchFolders(), fetchNotes()])

      // Корневого узла в базе нет — он только для отображения.
      state.folders.value = folders.filter((folder) => folder.id !== TREE_ROOT_ID)
      state.notes.value = notes
    } catch (err) {
      state.error.value = errorMessage(err, 'Не удалось загрузить файлы')
    } finally {
      state.loading.value = false
    }
  }

  /** Загрузка один раз за жизнь вкладки; повторные вызовы получают тот же промис. */
  function init(): Promise<void> {
    if (!import.meta.client) {
      return Promise.resolve()
    }

    if (!loadPromise) {
      loadPromise = reload()
    }

    return loadPromise
  }

  /** Заметки в папке. */
  function notesInFolder(folderId: string): Note[] {
    return state.notes.value.filter((note) => note.folderId === folderId)
  }

  /** Заметки, привязанные к карточке, по её id. */
  function noteForItem(itemId: string): Note | undefined {
    return state.notes.value.find((note) => note.itemId === itemId)
  }

  /**
   * Создаёт заметку (файл) в папке и обновляет списки.
   * Используется добавлением карточки в папку и сохранением саммари.
   */
  async function addNote(input: {
    title: string
    content: string
    folderId: string
    itemId?: string | null
    url?: string | null
  }): Promise<Note> {
    const note = await createNote(input)

    state.notes.value = [note, ...state.notes.value]

    return note
  }

  return {
    folders,
    notes,
    tree,
    selectableFolders,
    loading,
    error,
    init,
    reload,
    notesInFolder,
    noteForItem,
    addNote,
  }
}

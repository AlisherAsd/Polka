import { computed, readonly, ref } from 'vue'
import type { Ref } from 'vue'
import { copyFolder as copyFolderRequest, createNote, deleteFolder, deleteNote, fetchFolders, fetchNotes } from '~/api/notes'
import { useApiBase } from '~/api/client'
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
  const apiBase = useApiBase()
  const notify = useNotify()

  const folders = readonly(state.folders)
  const notes = readonly(state.notes)
  const loading = readonly(state.loading)
  const error = readonly(state.error)

  /** Дерево второй панели: папки и лежащие в них заметки. */
  const tree = computed<FileNode[]>(() => buildFileTree(state.folders.value, state.notes.value))

  /** Корневая папка «Мои знания». */
  const rootFolder = computed<Folder | null>(
    () => state.folders.value.find((folder) => folder.isRoot === true) ?? null,
  )

  /** Верхние папки: сначала «Мои знания», затем созданные пользователем. */
  const topFolders = computed<Folder[]>(() =>
    state.folders.value
      .filter((folder) => folder.isRoot === true || folder.parentId == null)
      .sort((a, b) => Number(Boolean(b.isRoot)) - Number(Boolean(a.isRoot))),
  )

  /** Папки, доступные для выбора (без корневого узла). */
  const selectableFolders = computed<Folder[]>(() =>
    state.folders.value.filter((folder) => folder.id !== TREE_ROOT_ID),
  )

  /** Перезагружает папки и заметки с сервера. */
  async function reload(): Promise<void> {
    state.loading.value = true
    state.error.value = null

    try {
      const [folders, notes] = await Promise.all([fetchFolders(apiBase), fetchNotes(apiBase)])

      // Корневого узла в базе нет — он только для отображения.
      state.folders.value = folders.filter((folder) => folder.id !== TREE_ROOT_ID)
      state.notes.value = notes
    } catch (err) {
      state.error.value = errorMessage(err, 'Не удалось загрузить файлы')
      notify.error(state.error.value, 'Файлы не загрузились')
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

    // Дерево может устареть (например, папку создали в другой вкладке) —
    // поэтому при каждом монтировании страницы перечитываем данные.
    return loadPromise.then(() => reload())
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
   * Тост показывает вызывающий код: у одной заметки несколько сценариев.
   */
  async function addNote(input: {
    title: string
    content: string
    folderId: string
    itemId?: string | null
    url?: string | null
  }): Promise<Note> {
    const note = await createNote(apiBase, input)

    state.notes.value = [note, ...state.notes.value]

    return note
  }

  /**
   * Удаляет папку пользователя. Заметки внутри остаются — сервер обнуляет
   * их `folder_id`, поэтому после перезагрузки они окажутся в корне.
   */
  async function removeFolder(folderId: string): Promise<void> {
    const folder = state.folders.value.find((item) => item.id === folderId)

    try {
      await deleteFolder(apiBase, folderId)

      state.folders.value = state.folders.value.filter((item) => item.id !== folderId)
      state.notes.value = state.notes.value.map((note) =>
        note.folderId === folderId ? { ...note, folderId: null } : note,
      )

      notify.success(`Папка «${folder?.name ?? folderId}» удалена`)
    } catch (err) {
      notify.fail(err, 'Не удалось удалить папку')
      throw err
    }
  }

  /** Копирует папку вместе с доской и заметками. */
  async function copyFolder(folderId: string): Promise<Folder | null> {
    const folder = state.folders.value.find((item) => item.id === folderId)

    try {
      const created = await copyFolderRequest(apiBase, folderId)

      await reload()
      notify.success(`Скопировано: «${created.name}»`)

      return created
    } catch (err) {
      notify.fail(err, 'Не удалось скопировать папку')

      return null
    }
  }

  /** Удаляет заметку (файл). */
  async function removeNote(noteId: string): Promise<void> {
    const note = state.notes.value.find((item) => item.id === noteId)

    try {
      await deleteNote(apiBase, noteId)

      state.notes.value = state.notes.value.filter((item) => item.id !== noteId)
      notify.success(`Файл «${note?.title ?? noteId}» удалён`)
    } catch (err) {
      notify.fail(err, 'Не удалось удалить файл')
      throw err
    }
  }

  return {
    folders,
    notes,
    tree,
    rootFolder,
    topFolders,
    selectableFolders,
    loading,
    error,
    init,
    reload,
    notesInFolder,
    noteForItem,
    addNote,
    removeFolder,
    removeNote,
    copyFolder,
  }
}

import type { Folder, Note } from '~/api/notes'

/**
 * Дерево файлов строится из реальных папок и заметок бэкенда
 * (`/api/folders`, `/api/notes`) — моковых узлов больше нет.
 */

/** Узел дерева второй панели. */
export interface FileNode {
  id: string
  name: string
  type: 'folder' | 'file'
  /** Заметка, если это файл. */
  note?: Note
  children?: FileNode[]
}

/** Корневой узел «База знаний» — папки кладутся внутрь него. */
export const TREE_ROOT_ID = 'knowledge'

/** Собирает дерево: папки верхнего уровня + заметки внутри своих папок. */
export function buildFileTree(folders: readonly Folder[], notes: readonly Note[]): FileNode[] {
  const byFolder = new Map<string, Note[]>()

  for (const note of notes) {
    const key = note.folderId ?? ''
    const bucket = byFolder.get(key)

    if (bucket) {
      bucket.push(note)
    } else {
      byFolder.set(key, [note])
    }
  }

  /** Файлы папки: заметки сортируются по времени обновления. */
  const filesOf = (folderId: string): FileNode[] =>
    (byFolder.get(folderId) ?? [])
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((note) => ({ id: note.id, name: note.title, type: 'file' as const, note }))

  const folderNodes: FileNode[] = folders
    .filter((folder) => folder.id !== TREE_ROOT_ID)
    .map((folder) => {
      const children = filesOf(folder.id)

      return {
        id: folder.id,
        name: folder.name,
        type: 'folder' as const,
        // Пустые папки тоже видны — по ним кликают, чтобы положить карточку.
        children,
      }
    })

  return [
    {
      id: TREE_ROOT_ID,
      name: 'База знаний',
      type: 'folder',
      children: folderNodes,
    },
    ...filesOf(''),
  ]
}

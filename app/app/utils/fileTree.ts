import type { Folder, Note } from '~/api/notes'

/**
 * Дерево файлов строится из реальных папок и заметок бэкенда
 * (`/api/folders`, `/api/notes`).
 *
 * Иерархия соответствует модели «Мои знания»:
 *   * корневая папка (isRoot) — всегда первая, у неё есть доска;
 *   * остальные верхние папки — на том же уровне, у каждой своя доска;
 *   * внутри папки — её заметки (файлы).
 */

/** Узел дерева второй панели. */
export interface FileNode {
  id: string
  name: string
  type: 'folder' | 'file'
  /** Заметка, если это файл. */
  note?: Note
  /** id доски папки (у верхних папок есть всегда). */
  boardId?: string | null
  /** Корневая папка «Мои знания». */
  isRoot?: boolean
  children?: FileNode[]
}

/**
 * Идентификатор корневого узла для раскрытия в UI.
 * Настоящий id корня приходит с сервера (`root-<userId>`), поэтому
 * дополнительно используем логический маркер.
 */
export const TREE_ROOT_ID = 'knowledge'

/** Собирает дерево: корень + верхние папки, внутри — заметки. */
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

  // «Мои знания» — такая же папка, как остальные: у неё своя доска и файлы.
  const folderNodes: FileNode[] = folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    type: 'folder' as const,
    boardId: folder.boardId ?? null,
    isRoot: folder.isRoot === true,
    children: filesOf(folder.id),
  }))

  // Заметки без папки — в корне.
  return [...folderNodes, ...filesOf('')]
}

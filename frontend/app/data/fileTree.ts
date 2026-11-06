/** Узел моковой файловой структуры второй панели. */
export interface FileNode {
  id: string
  name: string
  type: 'folder' | 'file'
  children?: FileNode[]
}

/**
 * Пустые папки базы знаний.
 * Наполняются в рантайме: карточки «перемещаются в папку» сессионно.
 */
export const FILE_TREE: readonly FileNode[] = [
  {
    id: 'knowledge',
    name: 'База знаний',
    type: 'folder',
    children: [
      { id: 'design', name: 'Дизайн', type: 'folder', children: [] },
      { id: 'dev', name: 'Разработка', type: 'folder', children: [] },
      { id: 'video', name: 'Видео', type: 'folder', children: [] },
      { id: 'articles', name: 'Статьи', type: 'folder', children: [] },
    ],
  },
]

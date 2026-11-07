import type { Card } from '~/types/card'

/**
 * Моковые заметки базы знаний. Сохранение пока не сделано — данные статичные.
 * Заметка соответствует карточке типа `note` (см. `app/types/card.ts`).
 */
export interface Note {
  id: string
  title: string
  /** Markdown-содержимое заметки. */
  content: string
  /** Папка, в которой заметка лежит в дереве. */
  folderId: string
  updatedAt: string
}

const NOTES: readonly Note[] = [
  {
    id: 'design-principles',
    title: 'Принципы интерфейса',
    folderId: 'design',
    updatedAt: '2026-11-04',
    content: `# Принципы интерфейса

Короткий чек-лист, по которому проверяю макеты перед вёрсткой.

## Иерархия

- Один главный акцент на экран — **primary** цвет.
- Размеры текста: заголовок, подзаголовок, тело, подпись. Не больше четырёх уровней.
- Пустое пространство важнее декора: лучше убрать рамку, чем добавлять разделитель.

## Состояния

| Элемент | Default | Hover | Disabled |
| --- | --- | --- | --- |
| Кнопка | заливка | темнее на 10% | 40% прозрачности |
| Поле | рамка line | рамка neutral-400 | серая заливка |
| Карточка | тень sm | тень md | — |

## Что проверять перед сдачей

1. Все интерактивные элементы доступны с клавиатуры.
2. У иконок-кнопок есть \`aria-label\`.
3. На ширине 360px ничего не вылезает за экран.

> Если сомневаетесь — упрощайте. Половина элементов на макете обычно лишняя.

\`\`\`css
.card {
  border: 1px solid var(--color-line);
  border-radius: 1rem;
}
\`\`\`
`,
  },
  {
    id: 'dev-setup',
    title: 'Настройка проекта',
    folderId: 'dev',
    updatedAt: '2026-11-05',
    content: `# Настройка проекта

Стек: **Nuxt 4**, Vue 3, TypeScript, Tailwind v4, Nuxt UI v4.

## Установка

\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`

## Переменные окружения

- \`NUXT_OPENROUTER_KEY\` — ключ для AI-чата.
- Остальное не требуется: данные живут в \`localStorage\`.

## Полезные команды

| Команда | Что делает |
| --- | --- |
| \`npm run dev\` | dev-сервер |
| \`npm run build\` | прод-сборка |
| \`npm run typecheck\` | проверка типов |

## Заметки по структуре

- \`app/components\` — компоненты, автоматически импортируются.
- \`app/composables\` — состояние приложения.
- \`server/api\` — только прокси к модели, данных там нет.
`,
  },
  {
    id: 'video-notes',
    title: 'Разбор видео',
    folderId: 'video',
    updatedAt: '2026-11-06',
    content: `# Разбор видео

## Что смотреть

- [x] Как устроен онбординг
- [ ] Разбор горячих клавиш
- [ ] Монтаж вступлений

## Тезисы

1. Первые 30 секунд решают, останется ли зритель.
2. Один ролик — одна мысль.
3. Субтитры повышают досматриваемость.

---

Ссылки на источники собираются в полке автоматически: достаточно вставить URL.
`,
  },
]

/** Заметка как карточка списка: у заметок нет ссылки, а `updatedAt` уже есть. */
export function toNoteCard(note: Note): Card {
  return {
    id: note.id,
    type: 'note',
    title: note.title,
    content: note.content,
    createdAt: note.updatedAt,
    updatedAt: note.updatedAt,
  }
}

/** Заметка по id (мок). */
export function findNote(id: string): Note | undefined {
  return NOTES.find((note) => note.id === id)
}

/** Заметка, привязанная к папке (для перехода из дерева). */
export function findNoteByFolder(folderId: string): Note | undefined {
  return NOTES.find((note) => note.folderId === folderId)
}

/** Все заметки — для списков. */
export const ALL_NOTES: readonly Note[] = NOTES

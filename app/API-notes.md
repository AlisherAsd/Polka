# Polka API — заметки и папки

Заметка и файл — одна сущность (`notes`): название, контент, папка, ссылка на карточку.

## Папки

| Метод  | Путь            | Тело / ответ |
| ------ | --------------- | ------------ |
| GET    | `/api/folders`  | `{ folders: Folder[] }`; по умолчанию есть `ai-voult` |
| POST   | `/api/folders`  | `{ name }` → `201 { folder }`, `409` если папка с таким id уже есть |

`Folder = { id, name, slug?, createdAt }`.

## Заметки

| Метод  | Путь                    | Тело / ответ |
| ------ | ----------------------- | ------------ |
| GET    | `/api/notes`            | `?folderId=` / `?itemId=` → `{ notes }` |
| POST   | `/api/notes`            | `{ title, content, folderId?, itemId?, url? }` → `201 { note }` |
| GET    | `/api/notes/:id`        | `{ note }`, `404` если нет |
| PATCH  | `/api/notes/:id`        | `{ title?, content?, folderId? }` → `{ note }` |
| DELETE | `/api/notes/:id`        | `204` |

`Note = { id, folderId, itemId?, title, content, url?, createdAt, updatedAt }`.

Ошибки: `400 Не указано название заметки`, `400 Пустая заметка`, `404 Папка не найдена`,
`404 Заметка не найдена`.

## Автоматика

- `POST /api/summarize` после ответа модели создаёт заметку в папке `ai-voult`
  (название — заголовок карточки, контент — саммари, `itemId` — id карточки).
  Отключить: `{ "save": false }`.
- Добавление карточки в папку на фронте (`useCards.setFolder`) создаёт заметку
  с названием карточки и её описанием/ссылкой.
- Удаление карточки удаляет её заметки (`ON DELETE CASCADE` по `item_id`).

## Схема (миграция `frontend/migrations/0003_notes.sql`)

```sql
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Отличия от исходного контракта: карточки живут в `items` (не `cards`), поэтому
связь называется `item_id`; таблицы `selections` в проекте нет, поэтому её поля
в `notes` не заводятся; `name` → `title` (это же название заметки на фронте).

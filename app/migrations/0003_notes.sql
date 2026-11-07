-- Заметки базы знаний. Контракт один: `notes` — это и заметки, и файлы.
--   * title    — название (как `name` у файла);
--   * content  — markdown/текст;
--   * item_id  — ссылка на карточку (`items.id`), откуда заметка появилась;
--   * folder_id — папка, в которой лежит заметка;
--   * url      — ссылка, если заметка получилась из внешнего источника.
--
-- Папки вынесены в `folders`: «файл → папка» нужен явно, плюс служебная
-- папка `ai-voult` для саммари от ИИ.

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes (folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_item ON notes (item_id);

-- Папки по умолчанию: служебная `ai-voult` (саммари от ИИ) и пользовательские.
INSERT INTO folders (id, name, slug, created_at) VALUES
  ('ai-voult', 'ai-voult', 'ai-voult', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

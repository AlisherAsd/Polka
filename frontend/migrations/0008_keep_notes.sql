-- Заметки больше не удаляются вместе с карточкой.
--
-- Раньше `notes.item_id REFERENCES items(id) ON DELETE CASCADE` — при удалении
-- карточки пропадали её файлы. Теперь связь обнуляется (`SET NULL`): заметка
-- остаётся в своей папке, просто теряет ссылку на карточку.
--
-- SQLite не умеет менять ON DELETE у существующего FK, поэтому пересобираем
-- таблицу (12-step), сохраняя все данные и индексы.

CREATE TABLE notes_new (
  id TEXT PRIMARY KEY,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO notes_new (id, folder_id, item_id, title, content, url, created_at, updated_at, user_id)
SELECT id, folder_id, item_id, title, content, url, created_at, updated_at, user_id FROM notes;

DROP TABLE notes;

ALTER TABLE notes_new RENAME TO notes;

CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes (folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_item ON notes (item_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes (user_id);

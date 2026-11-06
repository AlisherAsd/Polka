-- Переход на новую модель карточки (Card):
--   description   → summary
--   thumbnail_url → thumbnail
--   author_name   → удаляется
--   url           → становится необязательным (у заметок ссылки нет)
--   type          → 'telegram' → 'article'
--   + content, file_id, updated_at
--
-- SQLite не умеет снимать NOT NULL и DROP COLUMN появился только в 3.35,
-- поэтому используем официальный «12-step» пересбор таблицы.

CREATE TABLE items_new (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  url TEXT,
  title TEXT NOT NULL,
  thumbnail TEXT,
  summary TEXT,
  content TEXT,
  file_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO items_new (id, type, url, title, thumbnail, summary, content, file_id, created_at, updated_at)
SELECT
  id,
  CASE WHEN type = 'telegram' THEN 'article' ELSE type END,
  url,
  title,
  thumbnail_url,
  description,
  NULL,
  NULL,
  created_at,
  created_at
FROM items;

DROP TABLE items;

ALTER TABLE items_new RENAME TO items;

CREATE INDEX IF NOT EXISTS idx_items_created_at ON items (created_at);

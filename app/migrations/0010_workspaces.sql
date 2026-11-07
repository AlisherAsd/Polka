-- «Мои знания»: корневая папка и доска у каждой верхней папки.
--
-- Модель:
--   * у каждого пользователя есть корневая папка (`folders.is_root = 1`),
--     она же «Мои знания»;
--   * каждая папка верхнего уровня имеет ровно одну доску (`boards`);
--     вложенные папки своей доски не имеют и рисуются на доске родителя;
--   * доска привязывается к папке (`boards.folder_id`), узлы — к доске
--     (`board_nodes.board_id`);
--   * публичность — только на доску: если доска (и её папка) опубликована,
--     всё её содержимое становится публичным.
--
-- Существующие `board_nodes` (в них был только `user_id`) переезжают
-- на доску корневой папки этого пользователя, чтобы данные не потерялись.

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_boards_folder ON boards (folder_id);
CREATE INDEX IF NOT EXISTS idx_boards_user ON boards (user_id);

-- Корневая папка: у пользователя может быть только одна.
ALTER TABLE folders ADD COLUMN is_root INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_folders_root ON folders (user_id) WHERE is_root = 1;

-- Вложенность (верхние папки — parent_id IS NULL).
ALTER TABLE folders ADD COLUMN parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE;

-- Узлы доски теперь принадлежат конкретной доске.
ALTER TABLE board_nodes ADD COLUMN board_id TEXT REFERENCES boards(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_board_nodes_board ON board_nodes (board_id);

-- Доски для уже существующих корней не нужны: корень создаётся лениво,
-- но существующие узлы надо куда-то привязать. Создаём по корневой папке
-- на каждого пользователя, у которого есть узлы, и переносим узлы туда.

INSERT INTO folders (id, name, slug, created_at, user_id, is_root)
SELECT 'root-' || u.id, 'Мои знания', 'root-' || u.id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), u.id, 1
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM folders f WHERE f.user_id = u.id AND f.is_root = 1
);

INSERT INTO boards (id, folder_id, user_id, created_at)
SELECT 'board-' || f.id, f.id, f.user_id, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM folders f
WHERE f.is_root = 1
  AND NOT EXISTS (SELECT 1 FROM boards b WHERE b.folder_id = f.id);

UPDATE board_nodes
SET board_id = (
  SELECT b.id FROM boards b
  WHERE b.user_id = board_nodes.user_id
  ORDER BY b.created_at ASC
  LIMIT 1
)
WHERE board_id IS NULL;

-- Узлы пользователей без корня остаются без доски; они не должны мешать
-- уникальным индексам — чистим такие строки.
DELETE FROM board_nodes WHERE board_id IS NULL;

-- Публикация теперь касается доски: `ref_id` = `boards.id`.
ALTER TABLE shares ADD COLUMN board_id TEXT REFERENCES boards(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_shares_board ON shares (board_id);

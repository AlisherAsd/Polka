-- Данные принадлежат пользователю.
--
--   * items / notes / folders / board_nodes получают `user_id` → users(id);
--   * существующие строки остаются с `user_id = NULL` («общие»): их видно всем,
--     поэтому текущие данные и доска не пропадают. `make claim-data` переносит
--     их на конкретный аккаунт, если нужно.
--   * `ai-voult` — служебная папка: у неё `user_id = NULL` и она доступна всем.
--
-- ON DELETE CASCADE: удалили аккаунт — ушли его данные.

ALTER TABLE items ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notes ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE folders ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE board_nodes ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_items_user ON items (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes (user_id);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders (user_id);
CREATE INDEX IF NOT EXISTS idx_board_nodes_user ON board_nodes (user_id);

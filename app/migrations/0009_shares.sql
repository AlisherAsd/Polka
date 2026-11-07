-- Публичные подборки: папка или доска делятся ссылкой без входа.
--
--   * `kind`  — что делим: папка (`folder`) или доска (`board`);
--   * `ref_id` — id папки (`folders.id`) либо владельца доски (`user_id`);
--   * `slug`  — короткий публичный идентификатор в ссылке `/b/<slug>`;
--   * `user_id` — владелец, чтобы в любой момент можно было отозвать ссылку.
--
-- Содержимое не дублируется: страница показывает записи владельца в реальном
-- времени (это те же notes/items, что и в приложении).

CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  ref_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shares_user ON shares (user_id);
CREATE INDEX IF NOT EXISTS idx_shares_ref ON shares (ref_id);

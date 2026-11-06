-- Расположение узлов на доске: карточка или заметка-файл.
--   * item_id — карточка (`items.id`);
--   * note_id — заметка/файл (`notes.id`), связь с карточкой задаётся `notes.item_id`;
--   * x, y     — логические координаты холста в px (до масштабирования);
--   * width, height — размер блока (для файлов меняется ресайзом, карточки фиксированы).
-- Один узел — одна строка: `item_id` и `note_id` взаимоисключающие.

CREATE TABLE IF NOT EXISTS board_nodes (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  x REAL NOT NULL DEFAULT 24,
  y REAL NOT NULL DEFAULT 24,
  width REAL,
  height REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_board_nodes_item ON board_nodes (item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_board_nodes_note ON board_nodes (note_id);

-- Аутентификация: пользователи и их сессии.
--
-- Пароли не хранятся в открытом виде: `password_hash` — PBKDF2-SHA256
-- (WebCrypto) с индивидуальной солью. Токены сессий тоже хранятся хешами,
-- поэтому утечка базы не даёт готовых токенов.
--
-- Владение данными (user_id у items/notes) намеренно не добавляется:
-- авторизация пока ограничивает только функции на фронте.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

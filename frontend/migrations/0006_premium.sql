-- Премиум-доступ к ИИ.
--
-- `is_premium = 1` — запросы к модели идут серверным ключом из `OPENROUTER_KEY`.
-- Без премиума пользователь передаёт свой ключ в заголовке `X-OpenRouter-Key`
-- (он живёт только в localStorage клиента и в базе не сохраняется).
-- Платёжки пока нет: «купить» просто включает флаг.

ALTER TABLE users ADD COLUMN is_premium INTEGER NOT NULL DEFAULT 0;

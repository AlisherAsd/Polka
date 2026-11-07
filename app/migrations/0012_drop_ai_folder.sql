-- Убираем служебную папку `ai-voult`.
--
-- Саммари больше не сохраняется автоматически: после ответа модели
-- пользователь сам выбирает папку для файла. Значит, отдельная папка ИИ
-- не нужна — и у старых пользователей её тоже надо убрать.
--
-- Файлы не теряются: заметки из `ai-voult` переезжают в «Мои знания»
-- владельца. Заметки без владельца (старые «общие») остаются без папки
-- и показываются в корне дерева.

-- Публичные ссылки на удаляемую папку/её доску больше не нужны.
DELETE FROM shares
WHERE (kind = 'folder' AND ref_id IN (SELECT id FROM folders WHERE name = 'ai-voult'))
   OR (kind = 'board' AND ref_id IN (
     SELECT b.id FROM boards b JOIN folders f ON f.id = b.folder_id WHERE f.name = 'ai-voult'
   ));

-- Файлы владельца — в его корень.
UPDATE notes
SET folder_id = (
  SELECT f.id FROM folders f
  WHERE f.user_id = notes.user_id AND f.is_root = 1
)
WHERE folder_id IN (SELECT id FROM folders WHERE name = 'ai-voult')
  AND user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM folders f WHERE f.user_id = notes.user_id AND f.is_root = 1
  );

-- Остальные (без владельца/корня) остаются без папки.
UPDATE notes
SET folder_id = NULL
WHERE folder_id IN (SELECT id FROM folders WHERE name = 'ai-voult');

-- Доска папки и её узлы.
DELETE FROM board_nodes
WHERE board_id IN (
  SELECT b.id FROM boards b JOIN folders f ON f.id = b.folder_id WHERE f.name = 'ai-voult'
);

DELETE FROM boards
WHERE folder_id IN (SELECT id FROM folders WHERE name = 'ai-voult');

DELETE FROM folders WHERE name = 'ai-voult';

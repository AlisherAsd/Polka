-- Уникальность узлов доски — в пределах доски, а не глобально.
--
-- Индексы `idx_board_nodes_item` и `idx_board_nodes_note` появились, когда
-- доска была одна на пользователя: они не давали положить карточку/заметку
-- в два места. После перехода на доски по папкам (0010) это ломает сценарий
-- «одна карточка связана с заметками в разных папках»: при открытии второй
-- доски вставка падала с `UNIQUE constraint failed: board_nodes.item_id`,
-- а клиент, не получив ответ, показывал узлы предыдущей доски.
--
-- Теперь один и тот же узел может лежать на разных досках, но на одной
-- доске — только один раз.

DROP INDEX IF EXISTS idx_board_nodes_item;
DROP INDEX IF EXISTS idx_board_nodes_note;

-- Частичные индексы: NULL (узел — карточка или заметка) не участвует.
CREATE UNIQUE INDEX IF NOT EXISTS idx_board_nodes_board_item
  ON board_nodes (board_id, item_id) WHERE item_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_board_nodes_board_note
  ON board_nodes (board_id, note_id) WHERE note_id IS NOT NULL;

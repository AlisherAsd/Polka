/**
 * Загрузка общих данных при старте приложения (одна на вкладку):
 * карточки (`/api/items`) и файлы (`/api/folders` + `/api/notes`).
 *
 * Раньше каждая страница грузила их сама, из-за чего прямой заход на `/board`
 * показывал пустую доску. Теперь стор наполняется сразу при старте.
 */
export default defineNuxtPlugin(() => {
  const cards = useCards()
  const files = useFiles()

  // Не ждём: страницы рендерятся сразу, данные подъезжают по мере ответа.
  void Promise.allSettled([cards.init(), files.init()])
})

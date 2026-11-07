/**
 * Индекс поиска по сайту: страницы, разделы руководства и действия.
 *
 * Это статический список в коде — поиск не ходит на сервер и работает
 * офлайн, в том числе в нативном приложении. Данные пользователя
 * (карточки, файлы) здесь намеренно не индексируются.
 *
 * `keywords` — слова, по которым пункт тоже должен находиться
 * (синонимы, английские названия, частые опечатки вроде «премим»).
 */
export type SiteEntryKind = 'page' | 'section' | 'action'

export interface SiteEntry {
  id: string
  title: string
  description?: string
  kind: SiteEntryKind
  keywords?: string[]
  /** Куда перейти. */
  to?: string
  /** Действие, если пункт открывает модалку или переключает состояние. */
  action?:
    | 'add-link'
    | 'open-side-panel'
    | 'close-side-panel'
    | 'open-profile'
    | 'open-key'
    | 'open-premium'
    | 'sign-in'
    | 'sign-out'
    | 'go-board'
    | 'go-chat'
    | 'go-home'
    | 'go-manual'
}

/** Страницы приложения. */
const PAGES: SiteEntry[] = [
  {
    id: 'page-home',
    title: 'Главная',
    description: 'Карточки: всё сохранённое в одном списке',
    kind: 'page',
    keywords: ['карточки', 'ссылки', 'список', 'home', 'index'],
    to: '/',
  },
  {
    id: 'page-board',
    title: 'Доска',
    description: 'Холст с карточками и файлами',
    kind: 'page',
    keywords: ['холст', 'canvas', 'перетаскивание', 'board'],
    to: '/board',
  },
  {
    id: 'page-chat',
    title: 'AI-чат',
    description: 'Вопросы по вашим материалам',
    kind: 'page',
    keywords: ['чат', 'ии', 'ai', 'вопросы', 'chat'],
    to: '/chat',
  },
  {
    id: 'page-manual',
    title: 'Руководство',
    description: 'Как пользоваться сервисом',
    kind: 'page',
    keywords: ['помощь', 'инструкция', 'мануал', 'help', 'docs'],
    to: '/manual',
  },
  {
    id: 'page-landing',
    title: 'О сервисе',
    description: 'Посадочная страница',
    kind: 'page',
    keywords: ['лендинг', 'landing', 'о проекте'],
    to: '/landing',
  },
]

/** Разделы руководства — ведут на якоря. */
const SECTIONS: SiteEntry[] = [
  {
    id: 'section-start',
    title: 'С чего начать',
    kind: 'section',
    keywords: ['регистрация', 'вход', 'аккаунт', 'пароль', 'регистрация аккаунта'],
    to: '/manual#start',
  },
  {
    id: 'section-cards',
    title: 'Карточки',
    kind: 'section',
    keywords: ['добавить ссылку', 'youtube', 'tiktok', 'telegram', 'статья'],
    to: '/manual#cards',
  },
  {
    id: 'section-files',
    title: 'Файлы и папки',
    kind: 'section',
    keywords: ['заметки', 'папка', 'ai-voult', 'удалить файл'],
    to: '/manual#files',
  },
  {
    id: 'section-board',
    title: 'Доска',
    kind: 'section',
    keywords: ['холст', 'перетащить', 'масштаб', 'зум'],
    to: '/manual#board',
  },
  {
    id: 'section-ai',
    title: 'ИИ',
    kind: 'section',
    keywords: ['ключ', 'премиум', 'саммари', 'суммировать', 'openrouter'],
    to: '/manual#ai',
  },
  {
    id: 'section-misc',
    title: 'Полезно знать',
    kind: 'section',
    keywords: ['версия', 'панель', 'ширина', 'подсказка'],
    to: '/manual#shortcuts',
  },
]

/** Действия: открывают модалки или переключают панель. */
const ACTIONS: SiteEntry[] = [
  {
    id: 'action-add-link',
    title: 'Добавить ссылку',
    description: 'Создать новую карточку',
    kind: 'action',
    keywords: ['плюс', 'новая карточка', 'сохранить ссылку', 'добавить'],
    action: 'add-link',
  },
  {
    id: 'action-side-panel-open',
    title: 'Показать панель файлов',
    kind: 'action',
    keywords: ['файлы', 'дерево', 'папки', 'панель'],
    action: 'open-side-panel',
  },
  {
    id: 'action-side-panel-close',
    title: 'Скрыть панель файлов',
    kind: 'action',
    keywords: ['файлы', 'панель', 'скрыть'],
    action: 'close-side-panel',
  },
  {
    id: 'action-profile',
    title: 'Профиль',
    description: 'Аккаунт, премиум, ключ, выход',
    kind: 'action',
    keywords: ['аккаунт', 'настройки', 'email', 'профиль'],
    action: 'open-profile',
  },
  {
    id: 'action-key',
    title: 'Свой ключ OpenRouter',
    description: 'Ввести или заменить ключ ИИ',
    kind: 'action',
    keywords: ['ключ', 'api', 'openrouter', 'токен'],
    action: 'open-key',
  },
  {
    id: 'action-premium',
    title: 'Премиум',
    description: 'ИИ без своего ключа',
    kind: 'action',
    keywords: ['подписка', 'корона', 'premium', 'купить', 'премиу', 'премим', 'премиум'],
    action: 'open-premium',
  },
  {
    id: 'action-sign-in',
    title: 'Войти в аккаунт',
    kind: 'action',
    keywords: ['вход', 'логин', 'регистрация', 'signin', 'login'],
    action: 'sign-in',
  },
  {
    id: 'action-sign-out',
    title: 'Выйти из аккаунта',
    kind: 'action',
    keywords: ['выход', 'логаут', 'logout', 'signout'],
    action: 'sign-out',
  },
]

/** Полный индекс поиска. */
export const SITE_INDEX: readonly SiteEntry[] = [...PAGES, ...SECTIONS, ...ACTIONS]

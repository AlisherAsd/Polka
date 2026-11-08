<script setup lang="ts">
/**
 * Руководство пользователя. Открывается по кнопке «?» в хедере.
 *
 * Раскладка как у лендинга — без сайдбара и хедера, только контент
 * и кнопка «Назад» (возвращает туда, откуда пришли).
 */
definePageMeta({ layout: 'landing' })

useHead({ title: 'Полка — руководство' })

interface Section {
  id: string
  title: string
  /** Короткие шаги или факты. */
  items: string[]
}

const SECTIONS: readonly Section[] = [
  {
    id: 'start',
    title: 'С чего начать',
    items: [
      'Создайте аккаунт: кнопка «Войти» в правом верхнем углу → «Нет аккаунта? Зарегистрироваться». Пароль — минимум 8 символов.',
      'После входа открываются карточки, доска, файлы и чат.',
      'Добавить материал: кнопка «Добавить» в хедере или «+» в рейке слева.',
    ],
  },
  {
    id: 'cards',
    title: 'Карточки',
    items: [
      'Вставьте ссылку — Полка достанет заголовок, обложку и описание.',
      'Поддерживаются YouTube, TikTok, Telegram и обычные статьи.',
      'Выделение: клик по карточке, Shift — несколько, рамкой — пачка.',
      'Кнопка «Суммировать» на карточке просит ИИ собрать краткое содержание.',
    ],
  },
  {
    id: 'files',
    title: 'Файлы и папки',
    items: [
      'Вторая панель (стрелка в хедере) — дерево папок и файлов.',
      'Карточку можно положить в папку: выделите её → «Переместить в папку».',
      'После саммари файл можно сохранить в любую папку.',
      'Файл открывается как заметка: текст можно править и сохранять.',
      'Удалить папку или файл — иконка корзины справа от названия (появляется при наведении).',
    ],
  },
  {
    id: 'board',
    title: 'Доска',
    items: [
      'Доска — свободный холст: карточки и файлы можно перетаскивать.',
      'Позиции сохраняются, поэтому после перезагрузки всё на своих местах.',
      'Файлы, привязанные к карточке, соединяются с ней линией.',
      'Масштаб — кнопки «+»/«−» и ползунок в шапке доски.',
    ],
  },
  {
    id: 'ai',
    title: 'ИИ',
    items: [
      'ИИ работает двумя способами: со своим ключом OpenRouter или по премиуму (запросы идут через сервер Полки).',
      'Свой ключ: кнопка с ключом в хедере. Ключ хранится только в этом браузере и отправляется лишь в момент запроса.',
      'Премиум: кнопка с короной в хедере, ключ покупать не нужно.',
      'AI-чат — вопросы по вашим материалам; «Суммировать» — краткое содержание выделенного.',
    ],
  },
  {
    id: 'shortcuts',
    title: 'Полезно знать',
    items: [
      'Ширину панели файлов можно менять, потянув за её правую границу.',
      'Кнопка «?» всегда ведёт на эту страницу.',
      'Версия приложения — в подсказке при наведении на логотип.',
    ],
  },
]

/** Куда вернуться: история браузера, иначе на главную. */
function goBack(): void {
  if (import.meta.client && window.history.length > 1) {
    window.history.back()

    return
  }

  void navigateTo('/items')
}
</script>

<template>
  <div class="relative min-h-dvh overflow-hidden bg-app">
    <!-- То же свечение, что на лендинге -->
    <div
      class="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary-500/10 blur-[140px]"
      aria-hidden="true"
    />

    <div class="relative z-10 mx-auto w-full max-w-3xl px-6 py-10 sm:py-16">
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        size="md"
        icon="i-lucide-arrow-left"
        label="Назад"
        class="rounded-xl"
        @click="goBack"
      />

      <header class="mt-8 flex flex-col gap-2">
        <h1 class="text-3xl font-semibold leading-tight text-ink sm:text-4xl">Руководство</h1>
        <p class="max-w-xl text-sm leading-snug text-dim">
          Коротко о том, как устроена Полка: карточки, файлы, доска и ИИ.
        </p>
      </header>

      <nav class="mt-6 flex flex-wrap gap-2" aria-label="Разделы руководства">
        <a
          v-for="section in SECTIONS"
          :key="`nav-${section.id}`"
          :href="`#${section.id}`"
          class="rounded-full border border-line px-3 py-1 text-xs text-dim transition-colors hover:border-primary hover:text-ink"
        >
          {{ section.title }}
        </a>
      </nav>

      <div class="mt-10 flex flex-col gap-10">
        <section
          v-for="section in SECTIONS"
          :id="section.id"
          :key="section.id"
          class="flex scroll-mt-6 flex-col gap-3"
        >
          <h2 class="text-lg font-semibold text-ink sm:text-xl">{{ section.title }}</h2>

          <ul class="flex flex-col gap-2">
            <li
              v-for="(item, index) in section.items"
              :key="`${section.id}-${index}`"
              class="flex gap-2 text-sm leading-snug text-dim"
            >
              <UIcon name="i-lucide-dot" class="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </section>
      </div>

      <footer class="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          size="md"
          icon="i-lucide-arrow-left"
          label="Назад"
          class="rounded-xl"
          @click="goBack"
        />
        <UButton
          to="/items"
          color="primary"
          variant="solid"
          size="md"
          label="На главную"
          class="rounded-xl"
        />
      </footer>
    </div>
  </div>
</template>

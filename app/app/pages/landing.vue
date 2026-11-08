<script setup lang="ts">
/** Посадочная страница: длинная лента блоков с сепараторами. */
definePageMeta({ layout: 'landing' })

useHead({
  title: 'Полка — органайзер ссылок',
  meta: [
    {
      name: 'description',
      content: 'Сохраняйте ссылки, видео и статьи в одном месте. ИИ делает краткое содержание, а папки и доска помогают ничего не потерять.',
    },
  ],
})

function start(): void {
  navigateTo('/items')
}

interface Step {
  index: string
  title: string
  text: string
}

interface Card {
  title: string
  text: string
}

interface Question {
  question: string
  answer: string
}

const STEPS: readonly Step[] = [
  {
    index: '01',
    title: 'Сохраните ссылку',
    text: 'Вставьте адрес или отправьте страницу в Полку. Заголовок, обложка и источник подтянутся сами.',
  },
  {
    index: '02',
    title: 'Прочитайте главное',
    text: 'ИИ соберёт короткое саммари: о чём материал и стоит ли тратить на него время.',
  },
  {
    index: '03',
    title: 'Разложите по папкам',
    text: 'Соберите тему в папку или на доску. Поиск и теги помогут найти нужное через месяц.',
  },
]

const BENEFITS: readonly Card[] = [
  {
    title: 'Одна лента вместо десятка вкладок',
    text: 'YouTube, Telegram, статьи и видео — в одном списке с понятными названиями и обложками.',
  },
  {
    title: 'Саммари вместо «прочитаю потом»',
    text: 'Короткое содержание экономит время: видно, что внутри, ещё до открытия материала.',
  },
  {
    title: 'Порядок, который не нужно наводить',
    text: 'Папки, теги и доска: раскладывайте как удобно и находите нужное через поиск.',
  },
]

const AUDIENCE: readonly Card[] = [
  {
    title: 'Разработчикам',
    text: 'Документация, статьи и разборы — под рукой, с кратким содержанием и быстрым поиском.',
  },
  {
    title: 'Дизайнерам',
    text: 'Референсы, кейсы и туториалы по папкам: нашёл, сохранил, вернулся, когда понадобилось.',
  },
  {
    title: 'Исследователям',
    text: 'Материалы по теме собираются в одном месте, а не в переписке с самим собой.',
  },
]

const FAQ: readonly Question[] = [
  {
    question: 'Чем это отличается от обычных закладок в браузере?',
    answer: 'Полка хранит не только адрес, но и заголовок, обложку и краткое содержание. Плюс папки, теги и доска — чтобы материал можно было найти, а не просто сохранить.',
  },
  {
    question: 'Насколько можно доверять саммари от ИИ?',
    answer: 'Саммари помогает быстро понять, о чём материал, но не заменяет чтение. Для важных текстов лучше открыть источник.',
  },
  {
    question: 'Нужен ли свой ключ OpenRouter?',
    answer: 'Нет, можно пользоваться без него. Если хотите подключить свой ключ — он хранится только в вашем браузере и не попадает в базу.',
  },
  {
    question: 'Есть ли приложение для телефона?',
    answer: 'Отдельного приложения нет: Полка открывается в браузере на телефоне, и все материалы остаются на месте. Для Mac есть отдельное приложение.',
  },
  {
    question: 'Мои ссылки видны другим людям?',
    answer: 'По умолчанию — нет. Доступ к папке или доске появляется только по ссылке, которую вы сами опубликуете, и её можно отключить в любой момент.',
  },
]

/**
 * Появление блоков при прокрутке: класс `.has-reveal` добавляем только
 * на клиенте, чтобы без JS контент оставался видимым.
 */
let revealObserver: IntersectionObserver | null = null

onMounted(() => {
  if (typeof window === 'undefined') {
    return
  }

  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))

  if (
    nodes.length === 0
    || !('IntersectionObserver' in window)
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return
  }

  document.documentElement.classList.add('has-reveal')

  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        continue
      }

      const node = entry.target as HTMLElement

      node.classList.add('is-visible')
      revealObserver?.unobserve(node)

      // После появления убираем задержку, чтобы hover-увеличение было сразу.
      window.setTimeout(() => {
        node.style.transitionDelay = '0ms'
      }, 900)
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' })

  nodes.forEach((node, index) => {
    node.style.transitionDelay = `${(index % 3) * 70}ms`
    revealObserver?.observe(node)
  })
})

onBeforeUnmount(() => revealObserver?.disconnect())
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- Фоновое свечение -->
    <div
      class="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-primary-500/15 blur-[140px]"
      aria-hidden="true" />

    <!-- Герой -->
    <section class="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 py-24">
      <div class="flex w-full max-w-3xl flex-col items-center gap-8 py-4 text-center">
        <img
          src="/logofull.png"
          alt="Полка — органайзер ссылок"
          width="400"
          height="400"
          class="size-[400px] max-w-full select-none"
          draggable="false"
        >

        <p class="max-w-2xl text-balance text-xl font-medium leading-snug text-dim sm:text-2xl">
          Сохраняйте ссылки, видео и посты в одном месте — и находите нужное за
          секунды.
        </p>

        <div class="mt-4 flex flex-col items-center gap-4">
          <UButton type="button" color="primary" variant="solid" size="xl" label="Начать"
            trailing-icon="i-lucide-arrow-right"
            class="justify-center rounded-full !px-26 !py-5 text-lg font-semibold text-white shadow-[0_12px_32px_-8px_var(--color-primary-500)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-10px_var(--color-primary-500)]"
            :ui="{ base: 'gap-3' }" @click="start" />

          <p class="flex items-center gap-2 text-xs text-mute">
            <UIcon name="i-lucide-globe" class="size-3.5" />
            Веб
            <span aria-hidden="true">·</span>
            <UIcon name="i-lucide-laptop" class="size-3.5" />
            macOS
          </p>
        </div>
      </div>
    </section>

    <hr class="mx-auto my-12 max-w-5xl border-line" />

    <!-- Как это работает -->
    <section class="relative z-10 mx-auto w-full max-w-5xl px-6 py-4">
      <div data-reveal class="flex max-w-2xl flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-mute">Как это работает</p>
        <h2 class="text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
          Три шага от ссылки до порядка
        </h2>
        <p class="text-sm leading-relaxed text-dim">
          Ничего настраивать не нужно: сохранили, прочитали краткое содержание, вернулись,
          когда понадобилось.
        </p>
      </div>

      <ol class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <li
          v-for="step in STEPS"
          :key="step.index"
          data-reveal class="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.25)]"
        >
          <span class="text-xs font-semibold text-primary">{{ step.index }}</span>
          <h3 class="text-base font-semibold text-ink">{{ step.title }}</h3>
          <p class="text-sm leading-relaxed text-dim">{{ step.text }}</p>
        </li>
      </ol>
    </section>

    <hr class="mx-auto my-12 max-w-5xl border-line" />

    <!-- Преимущества -->
    <section class="relative z-10 mx-auto w-full max-w-5xl px-6 py-4">
      <div data-reveal class="flex max-w-2xl flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-mute">Почему это удобно</p>
        <h2 class="text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
          Меньше вкладок — больше толку
        </h2>
        <p class="text-sm leading-relaxed text-dim">
          Полка убирает хаос из закладок и превращает его в библиотеку, к которой хочется
          возвращаться.
        </p>
      </div>

      <div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <article
          v-for="item in BENEFITS"
          :key="item.title"
          data-reveal class="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.25)]"
        >
          <h3 class="text-base font-semibold text-ink">{{ item.title }}</h3>
          <p class="text-sm leading-relaxed text-dim">{{ item.text }}</p>
        </article>
      </div>
    </section>

    <hr class="mx-auto my-12 max-w-5xl border-line" />

    <!-- Для кого -->
    <section class="relative z-10 mx-auto w-full max-w-5xl px-6 py-4">
      <div data-reveal class="flex max-w-2xl flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-mute">Для кого</p>
        <h2 class="text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
          Тем, кто много читает и мало запоминает
        </h2>
        <p class="text-sm leading-relaxed text-dim">
          Если ссылки копятся, а руки до них не доходят — это знакомо.
        </p>
      </div>

      <div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <article
          v-for="item in AUDIENCE"
          :key="item.title"
          data-reveal class="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.25)]"
        >
          <h3 class="text-base font-semibold text-ink">{{ item.title }}</h3>
          <p class="text-sm leading-relaxed text-dim">{{ item.text }}</p>
        </article>
      </div>
    </section>

    <hr class="mx-auto my-12 max-w-5xl border-line" />

    <!-- Веб и macOS -->
    <section class="relative z-10 mx-auto w-full max-w-6xl px-6 py-4">
      <div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1.15fr]">
        <div class="flex flex-col gap-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-mute">Где открывается</p>
          <h2 class="text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
            Работает в вебе и на macOS
          </h2>
          <p class="text-sm leading-relaxed text-dim">
            Откройте Полку в браузере на компьютере или телефоне — или поставьте приложение
            для Mac. Материалы остаются на месте на любом устройстве.
          </p>

          <ul class="mt-2 flex flex-col gap-2 text-sm text-dim">
            <li class="flex items-start gap-2">
              <UIcon name="i-lucide-globe" class="mt-0.5 size-4 shrink-0 text-mute" />
              <span><span class="font-medium text-ink">Веб</span> — на любом устройстве, ничего устанавливать не нужно.</span>
            </li>
            <li class="flex items-start gap-2">
              <UIcon name="i-lucide-laptop" class="mt-0.5 size-4 shrink-0 text-mute" />
              <span><span class="font-medium text-ink">macOS</span> — отдельное приложение, тот же аккаунт и те же материалы.</span>
            </li>
          </ul>
        </div>

        <div class="flex flex-col gap-4">
          <figure data-reveal class="overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:scale-[1.01]">
            <img
              src="/mac.png"
              alt="Полка в приложении для macOS: доска с карточками"
              width="770"
              height="446"
              loading="lazy"
              class="w-full rounded-xl"
            >
            <figcaption class="px-2 pb-1 pt-2 text-[11px] text-mute">
              Приложение для macOS
            </figcaption>
          </figure>

          <figure data-reveal class="w-full overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:scale-[1.01]">
            <img
              src="/iphone.png"
              alt="Полка в браузере на телефоне"
              width="1100"
              height="861"
              loading="lazy"
              class="w-full rounded-xl"
            >
            <figcaption class="px-2 pb-1 pt-2 text-[11px] text-mute">
              Веб-версия на телефоне
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <hr class="mx-auto my-12 max-w-5xl border-line" />

    <!-- Вопросы -->
    <section class="relative z-10 mx-auto w-full max-w-3xl px-6 py-4">
      <div data-reveal class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-mute">Частые вопросы</p>
        <h2 class="text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
          Коротко о главном
        </h2>
      </div>

      <div class="mt-8 flex flex-col gap-3">
        <details
          v-for="item in FAQ"
          :key="item.question"
          data-reveal class="group rounded-2xl border border-line bg-surface px-4 py-3"
        >
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ink">
            {{ item.question }}
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 shrink-0 text-mute transition-transform group-open:rotate-180"
            />
          </summary>
          <p class="mt-2 text-sm leading-relaxed text-dim">{{ item.answer }}</p>
        </details>
      </div>
    </section>

    <hr class="mx-auto my-12 max-w-5xl border-line" />

    <!-- Финальный призыв -->
    <section data-reveal class="relative z-10 mx-auto w-full max-w-3xl px-6 pb-24 pt-4 text-center">
      <h2 class="text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
        Начните с одной ссылки
      </h2>
      <p class="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-dim">
        Сохраните то, что давно лежит во вкладках. Через месяц будете знать, где что искать.
      </p>
      <UButton
        type="button"
        color="primary"
        variant="solid"
        size="lg"
        label="Попробовать Полку"
        trailing-icon="i-lucide-arrow-right"
        class="mt-6 rounded-full !px-10 !py-4 text-base font-semibold text-white shadow-[0_12px_32px_-8px_var(--color-primary-500)] transition-all duration-200 hover:-translate-y-0.5"
        @click="start"
      />
    </section>
  </div>
</template>

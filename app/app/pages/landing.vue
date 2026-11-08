<script setup lang="ts">
/** Посадочная страница: длинная лента блоков с сепараторами. */
definePageMeta({ layout: 'landing' })

useHead({ title: 'Полка — органайзер ссылок' })

function start(): void {
  navigateTo('/items')
}

interface Feature {
  index: string
  title: string
  text: string
}

const FEATURES: readonly Feature[] = [
  {
    index: '01',
    title: 'Одна полка вместо десятка вкладок',
    text: 'Кидайте ссылку — мы достанем заголовок, обложку, автора и описание. YouTube, TikTok, Telegram и обычные статьи собираются в один аккуратный список.',
  },
  {
    index: '02',
    title: 'Порядок, который не нужно наводить',
    text: 'Папки, теги и доска. Раскладывайте материалы по темам, помечайте нужное и вытаскивайте на холст, когда требуется взглянуть на всё сразу.',
  },
  {
    index: '03',
    title: 'ИИ, который читает вместо вас',
    text: 'Выделите пару карточек и попросите саммари — модель соберёт ключевые мысли и ответит на вопрос по содержимому.',
  },
]

</script>

<template>
  <div class="relative overflow-hidden">
    <!-- Фоновое свечение -->
    <div
      class="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-primary-500/15 blur-[140px]"
      aria-hidden="true" />

    <!-- Герой -->
    <section class="relative z-10 flex min-h-dvh flex-col items-center justify-center px-6 py-24">
      <div class="flex w-full max-w-3xl flex-col items-center gap-10 py-4 text-center">
        <!-- Логотип (полная версия) вместо текстового заголовка -->
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

        <div class="mt-8 flex flex-col items-center gap-6">
          <UButton type="button" color="primary" variant="solid" size="xl" label="Начать"
            trailing-icon="i-lucide-arrow-right"
            class="justify-center rounded-full !px-26 !py-5 text-lg font-semibold text-white shadow-[0_12px_32px_-8px_var(--color-primary-500)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-10px_var(--color-primary-500)]"
            :ui="{ base: 'gap-3' }" @click="start" />
        </div>
      </div>
    </section>

    <hr class="mx-auto my-10 max-w-3xl border-line" />
  </div>
</template>

<script setup lang="ts">
/**
 * Лого с поповером: при наведении показывает версию (`1.<коммиты>`) и
 * последнее ключевое изменение в формате `feature: "сообщение"`.
 *
 * Триггер поповера — сам логотип (`w-fit`), поэтому обёртка не растягивается
 * на всю ширину рейки и лого остаётся по центру.
 */
import { APP_VERSION, RELEASE } from '~/utils/release'

/**
 * На телефоне попап не помещается — там оставляем только версию, без описания.
 * На сервере считаем «мобильным», чтобы SSR-разметка (только версия) совпадала
 * с первым клиентским рендером на телефоне и не давала hydration mismatch.
 */
const isMobile = ref<boolean>(true)

// После монтирования уточняем платформу: на десктопе появляется описание.
onMounted(() => {
  isMobile.value = isMobileViewport()
})

const props = withDefaults(
  defineProps<{
    /** Дополнительные классы для обёртки (например, отступ сверху). */
    class?: string
  }>(),
  { class: '' },
)
</script>

<template>
  <UPopover
    mode="hover"
    :open-delay="120"
    :content="{ side: 'right', sideOffset: 8 }"
    :ui="{ content: 'px-2 py-1' }"
  >
    <!--
      Триггер — ровно логотип: обёртка `w-fit` не растягивается и не сдвигает
      его ни по вертикали, ни по горизонтали. Отступ сверху — внешним классом.
    -->
    <NuxtLink
      to="/"
      class="block w-fit cursor-pointer"
      :class="props.class"
      aria-label="Полка — на главную"
    >
      <span
        class="block text-[15px] font-bold uppercase leading-none tracking-[-0.12em] text-black"
        style="transform: scaleY(3)"
      >
        полка
      </span>
    </NuxtLink>

    <template #content>
      <div class="flex max-w-56 flex-col gap-0.5 text-[11px] leading-tight">
        <p class="font-semibold text-ink">v{{ APP_VERSION }}</p>

        <!-- На мобильном описание скрыто: в тесноте оно не помещается -->
        <p v-if="!isMobile" class="text-dim">feature: "{{ RELEASE.latest }}"</p>
      </div>
    </template>
  </UPopover>
</template>

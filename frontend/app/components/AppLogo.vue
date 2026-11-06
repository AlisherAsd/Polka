<script setup lang="ts">
/**
 * Лого с поповером: при наведении показывает версию (`1.<коммиты>`) и
 * последнее ключевое изменение в формате `feature: "сообщение"`.
 *
 * Сам логотип вынесен в абсолютный слой, чтобы обёртка `UPopover` (inline-block
 * со своим триггером на `as-child`) не меняла высоту строки и не «поднимала»
 * лого в сайдбаре.
 */
import { APP_VERSION, RELEASE } from '~/utils/release'

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
    <!-- Прозрачный бокс того же размера, что и логотип: триггер поповера -->
    <span
      class="relative block w-full cursor-default py-1"
      :class="props.class"
      aria-label="Полка — на главную"
    >
      <NuxtLink to="/" class="block">
        <span
          class="block text-[15px] font-bold uppercase leading-none tracking-[-0.12em] text-black"
          style="transform: scaleY(3)"
        >
          полка
        </span>
      </NuxtLink>
    </span>

    <template #content>
      <div class="flex flex-col gap-0.5 text-[11px] leading-tight">
        <p class="font-semibold text-ink">v{{ APP_VERSION }}</p>
        <p class="text-dim">feature: "{{ RELEASE.latest }}"</p>
      </div>
    </template>
  </UPopover>
</template>

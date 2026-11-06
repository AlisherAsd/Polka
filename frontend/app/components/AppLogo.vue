<script setup lang="ts">
/**
 * Лого с поповером: при наведении показывает версию (`1.<коммиты>`)
 * и краткое описание последнего ключевого изменения.
 *
 * Логика та же у сайдбара и мобильного хедера, поэтому компонент один.
 */
import { APP_VERSION, RELEASE } from '~/utils/release'

withDefaults(
  defineProps<{
    /** Дополнительные классы для ссылки-обёртки. */
    class?: string
  }>(),
  { class: '' },
)
</script>

<template>
  <UPopover mode="hover" :open-delay="120" :content="{ side: 'right', sideOffset: 10 }">
    <NuxtLink to="/" class="shrink-0" aria-label="Полка — на главную">
      <span
        class="block text-[15px] font-bold uppercase leading-none tracking-[-0.12em] text-black"
        style="transform: scaleY(3)"
      >
        полка
      </span>
    </NuxtLink>

    <template #content>
      <div class="flex w-56 flex-col gap-1 p-3">
        <p class="text-sm font-semibold text-ink">Полка · v{{ APP_VERSION }}</p>
        <p class="text-xs leading-snug text-dim">{{ RELEASE.latest }}</p>
        <p class="text-[11px] text-mute">коммитов: {{ RELEASE.commits }}</p>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
/**
 * Старые публичные ссылки `/b/<slug>`.
 *
 * Отдельной страницы подборки больше нет: ссылка открывает ту же страницу
 * доски (`/board?share=<slug>`) — так любой человек видит доску владельца.
 * Редирект оставлен, чтобы уже разосланные ссылки продолжали работать.
 */
const route = useRoute()
const slug = String(route.params.slug ?? '')

await navigateTo(
  { path: '/board', query: slug.length > 0 ? { share: slug } : {} },
  { redirectCode: 302, replace: true },
)
</script>

<template>
  <div />
</template>

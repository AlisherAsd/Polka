<script setup lang="ts">
/** Кнопка «Премиум» с короной в хедере: видна, пока премиума нет. */
const { isPremium } = useAiKey()
const { openModal } = usePremiumModal()
const premiumActive = isFeaturePremiumActive()
</script>

<template>
  <UButton
    v-if="premiumActive && !isPremium"
    type="button"
    color="primary"
    variant="outline"
    size="md"
    icon="i-lucide-crown"
    label="Премиум"
    class="shrink-0 rounded-xl"
    aria-label="Оформить премиум"
    @click="openModal"
  />
</template>

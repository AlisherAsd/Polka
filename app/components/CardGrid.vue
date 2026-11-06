<script setup lang="ts">
import type { Card } from '~/types/card'

defineProps<{
  /** `readonly` — список приходит из readonly-рефа composable. */
  cards: readonly Card[]
  /** Выделенные карточки (id). */
  selectedIds: readonly string[]
}>()

const emit = defineEmits<{
  delete: [id: string]
  toggle: [id: string]
}>()

function handleDelete(id: string): void {
  emit('delete', id)
}

function handleToggle(id: string): void {
  emit('toggle', id)
}
</script>

<template>
  <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
    <li v-for="card in cards" :key="card.id" class="min-w-0">
      <CardItem
        :card="card"
        :selected="selectedIds.includes(card.id)"
        @delete="handleDelete"
        @toggle="handleToggle"
      />
    </li>
  </ul>
</template>

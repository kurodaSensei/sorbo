<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  layout: false,
  pageTransition: { name: 'wizard', mode: 'out-in' },
})

const route = useRoute()
const initialCoffeeId = computed(() => {
  const v = route.query.coffeeId
  return typeof v === 'string' ? v : null
})

// v3 (interruptor «catas»): nota rápida en una pantalla en lugar del asistente de 3 pasos.
const v3 = useFlag('catas')
</script>

<template>
  <V3NoteForm v-if="v3" :initial-coffee-id="initialCoffeeId" />
  <TastingWizard v-else mode="create" :initial-coffee-id="initialCoffeeId" />
</template>

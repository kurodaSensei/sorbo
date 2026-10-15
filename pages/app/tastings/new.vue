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
</script>

<template>
  <TastingWizard mode="create" :initial-coffee-id="initialCoffeeId" />
</template>

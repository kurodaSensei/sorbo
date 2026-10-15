<script setup lang="ts">
definePageMeta({
  layout: false,
  pageTransition: { name: 'wizard', mode: 'out-in' },
})
</script>

<template>
  <CoffeeWizard mode="create" />
</template>

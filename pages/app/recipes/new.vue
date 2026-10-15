<script setup lang="ts">
definePageMeta({
  layout: false,
  pageTransition: { name: 'wizard', mode: 'out-in' },
})
</script>

<template>
  <RecipeWizard mode="create" />
</template>

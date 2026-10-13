<script setup lang="ts">
// v2: la lista de notas es el Diario (/app).
definePageMeta({
  middleware: () => navigateTo('/app', { replace: true }),
})
</script>

<template>
  <div />
</template>

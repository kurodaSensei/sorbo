<script setup lang="ts">
// v2: la wishlist es el filtro «Quiero probar» de Mis cafés.
definePageMeta({
  middleware: () => navigateTo('/app/coffees?f=wish', { replace: true }),
})
</script>

<template>
  <div />
</template>

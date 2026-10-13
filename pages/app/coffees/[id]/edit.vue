<script setup lang="ts">
// En v2 la ficha del café ya es editable; esta ruta queda por compatibilidad.
definePageMeta({
  hideTabBar: true,
  middleware: to => navigateTo(`/app/coffees/${to.params.id}`, { replace: true }),
})
</script>

<template>
  <div />
</template>

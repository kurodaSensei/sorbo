<script setup lang="ts">
import { computed } from 'vue'

// Ruta de pantalla completa para la nota rápida v2. Mantiene vivos los
// enlaces existentes (detalle de café, cierre del Vertido, «Repetir») que
// llegan con ?coffeeId=… La edición sigue en /app/tastings/[id]/edit.
definePageMeta({
  layout: false,
  pageTransition: { name: 'wizard', mode: 'out-in' },
})

const route = useRoute()
const router = useRouter()

const initialCoffeeId = computed(() => {
  const v = route.query.coffeeId
  return typeof v === 'string' ? v : null
})

function cancel() {
  if (window.history.length > 1) router.back()
  else router.replace('/app')
}

function onSaved(id: string) {
  router.replace(`/app/tastings/${id}`)
}
</script>

<template>
  <div class="note-page">
    <NoteForm :initial-coffee-id="initialCoffeeId" @cancel="cancel" @saved="onSaved" />
  </div>
</template>

<style scoped>
.note-page {
  height: 100svh;
  padding-top: env(safe-area-inset-top);
  box-sizing: border-box;
  background: var(--bg);
  max-width: 640px;
  margin: 0 auto;
}
</style>

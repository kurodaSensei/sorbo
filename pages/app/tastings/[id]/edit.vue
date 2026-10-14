<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Tasting } from '~/types'

// Editar nota v2: la misma hoja de la nota rápida, en modo edición.
definePageMeta({
  layout: false,
  pageTransition: { name: 'wizard', mode: 'out-in' },
})

const route = useRoute()
const router = useRouter()
const tastingsStore = useTastingsStore()

const id = computed(() => route.params.id as string)
const tasting = ref<Tasting | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    await tastingsStore.loadById(id.value)
    tasting.value = tastingsStore.current as Tasting | null
  }
  finally {
    loading.value = false
    if (!tasting.value) router.replace('/app')
  }
})

function cancel() {
  if (window.history.length > 1) router.back()
  else router.replace(`/app/tastings/${id.value}`)
}

function onSaved() {
  router.replace(`/app/tastings/${id.value}`)
}
</script>

<template>
  <div class="note-page">
    <div v-if="loading" class="note-state"><span class="note-spin" aria-label="Cargando" /></div>
    <NoteForm v-else-if="tasting" :key="tasting.id" :tasting="tasting" @cancel="cancel" @saved="onSaved" />
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
.note-state { display: flex; height: 100%; align-items: center; justify-content: center; }
.note-spin { width: 24px; height: 24px; border-radius: 99px; border: 2px solid var(--line); border-top-color: var(--ink); animation: note-spin 0.8s linear infinite; }
@keyframes note-spin { to { transform: rotate(360deg); } }
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Coffee } from '~/types'

// Café v2: la ficha y su edición son la misma pantalla (CoffeeForm), con las
// notas de ese café debajo.
definePageMeta({ hideTabBar: true })

const route = useRoute()
const coffeesStore = useCoffeesStore()

const id = computed(() => route.params.id as string)
const coffee = ref<Coffee | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    await coffeesStore.loadById(id.value)
    coffee.value = coffeesStore.current as Coffee | null
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="cs-state"><span class="cs-spin" aria-label="Cargando" /></div>
  <div v-else-if="!coffee" class="cs-state">
    <p>No encontramos este café.</p>
    <NuxtLink to="/app/coffees" class="cs-link">Volver a Mis cafés</NuxtLink>
  </div>
  <CoffeeForm v-else :key="coffee.id" :coffee="coffee" />
</template>

<style scoped>
.cs-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 120px 16px; color: var(--ink-soft); font-family: var(--font-sans); }
.cs-spin { width: 24px; height: 24px; border-radius: 99px; border: 2px solid var(--line); border-top-color: var(--ink); animation: cs-spin 0.8s linear infinite; }
@keyframes cs-spin { to { transform: rotate(360deg); } }
.cs-link { min-height: var(--touch-min); display: flex; align-items: center; font-weight: 600; color: var(--primary-pressed); }
</style>

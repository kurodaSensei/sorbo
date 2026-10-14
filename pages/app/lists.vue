<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { DEFAULT_BREW_METHOD_OPTIONS, DEFAULT_FLAVOR_NOTES, DEFAULT_PROCESS_OPTIONS, DEFAULT_VARIETIES } from '~/utils/constants'
import { activeCount, catalogItems } from '~/utils/catalogs'

// Personalizar listas: entrada a los cinco catálogos de la persona.
const router = useRouter()
const settings = useSettingsStore()
const roastersStore = useRoastersStore()

onMounted(() => {
  if (!settings.prefs) settings.load().catch(() => {})
  roastersStore.loadAll().catch(() => {})
})

const p = computed(() => settings.prefs)
const rows = computed(() => [
  { to: '/app/roasters', label: 'Marcas', end: `${roastersStore.list.length}` },
  { to: '/app/methods', label: 'Métodos', end: `${activeCount(catalogItems(DEFAULT_BREW_METHOD_OPTIONS, p.value?.customBrewMethods), p.value?.disabledBrewMethods)}` },
  { to: '/app/processes', label: 'Procesos', end: `${activeCount(catalogItems(DEFAULT_PROCESS_OPTIONS, p.value?.customProcesses), p.value?.disabledProcesses)}` },
  { to: '/app/varieties', label: 'Variedades', end: `${activeCount(catalogItems(DEFAULT_VARIETIES, p.value?.customVarieties), p.value?.disabledVarieties)}` },
  { to: '/app/notes', label: 'Sabores', end: `${activeCount(catalogItems(DEFAULT_FLAVOR_NOTES, p.value?.customFlavorNotes), p.value?.disabledFlavorNotes)}` },
])
</script>

<template>
  <div class="ls">
    <header class="ls-head">
      <button type="button" class="ls-icon" aria-label="Volver" @click="router.back()">
        <AppIcon name="right" :size="22" :stroke="2" style="transform: rotate(180deg)" />
      </button>
      <h1 class="ls-title">Personalizar listas</h1>
    </header>

    <div class="ls-list">
      <NuxtLink v-for="r in rows" :key="r.to" :to="r.to" class="ls-row">
        <span>{{ r.label }}</span>
        <span class="ls-end">{{ r.end }} ›</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.ls { max-width: 640px; margin: 0 auto; padding: 12px 16px 32px; display: flex; flex-direction: column; gap: 16px; color: var(--ink); font-family: var(--font-sans); }
.ls-head { display: flex; align-items: center; gap: 4px; margin: 0 -8px; }
.ls-title { flex: 1; margin: 0; font: 400 28px/30px var(--font-display); }
.ls-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.ls-list { border-radius: var(--radius-md); background: var(--surface); display: flex; flex-direction: column; }
.ls-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 50px; padding: 8px 14px; font-size: 15px; color: var(--ink); }
.ls-row + .ls-row { border-top: 1px solid var(--line); }
.ls-row:focus-visible, .ls-icon:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: var(--radius-md); }
.ls-end { font-size: 14px; color: var(--ink-soft); flex-shrink: 0; }
</style>

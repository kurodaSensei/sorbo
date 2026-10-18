<script setup lang="ts">
// Hoja «Filtros y vista» v3. Mismo estado que la v1 (useCoffeeViewStore): un valor por grupo.
import type { Coffee } from '~/types'
import type { CoffeeSortBy, CoffeeViewMode } from '~/stores/coffeeView'

defineProps<{ count: number }>()
const open = defineModel<boolean>({ required: true })

const view = useCoffeeViewStore()
const coffeesStore = useCoffeesStore()
const roastersStore = useRoastersStore()
const { processOptions, varieties } = useCatalog()

onMounted(() => {
  if (roastersStore.list.length === 0) roastersStore.loadAll().catch(() => {})
})

const SORT_OPTIONS: { value: CoffeeSortBy, label: string }[] = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'nameAsc', label: 'Nombre A–Z' },
  { value: 'scaDesc', label: 'SCA más alto' },
  { value: 'priceAsc', label: 'Precio menor' },
  { value: 'priceDesc', label: 'Precio mayor' },
]
const VIEW_OPTIONS: { value: CoffeeViewMode, label: string }[] = [
  { value: 'detailed', label: 'Detallado' },
  { value: 'medium', label: 'Intermedio' },
  { value: 'compact', label: 'Compacto' },
]

// Solo valores que existen en la colección.
const countriesInUse = computed(() => [...new Set((coffeesStore.list as Coffee[]).map(c => c.originCountry).filter(Boolean))].sort() as string[])
const roastersInUse = computed(() => {
  const ids = new Set((coffeesStore.list as Coffee[]).map(c => c.roasterId).filter(Boolean))
  return roastersStore.list.filter(r => ids.has(r.id))
})

type Key = 'process' | 'variety' | 'roasterId' | 'country'
function toggle(key: Key, value: string) {
  view.state[key] = view.state[key] === value ? null : value
}

const groups = computed(() => [
  { key: 'process' as Key, title: 'Proceso', options: processOptions.value.map(p => ({ value: p.value, label: p.label })) },
  { key: 'variety' as Key, title: 'Variedad', options: varieties.value.map(v => ({ value: v, label: v })) },
  { key: 'roasterId' as Key, title: 'Marca', options: roastersInUse.value.map(r => ({ value: r.id, label: r.name })) },
  { key: 'country' as Key, title: 'País', options: countriesInUse.value.map(c => ({ value: c, label: c })) },
].filter(g => g.options.length))

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="v3 v3-sheet-wrap" @keydown="onKey">
      <div class="v3-sheet-veil" aria-hidden="true" @click="open = false" />
      <section role="dialog" aria-modal="true" aria-labelledby="cf-filters-title" class="v3-sheet">
        <span class="v3-sheet-handle" aria-hidden="true" />
        <div class="v3-sheet-head">
          <h2 id="cf-filters-title" class="v3-sheet-title">Filtros y vista</h2>
          <button type="button" class="v3-sheet-close" aria-label="Cerrar" @click="open = false">
            <Icon name="lucide:x" size="20" />
          </button>
        </div>

        <div class="body">
          <fieldset class="group">
            <legend class="legend">Ordenar por</legend>
            <div class="chips">
              <button
                v-for="o in SORT_OPTIONS"
                :key="o.value"
                type="button"
                :class="['v3-chip', { 'v3-chip--on': view.state.sortBy === o.value }]"
                :aria-pressed="view.state.sortBy === o.value"
                @click="view.state.sortBy = o.value"
              >
                {{ o.label }}
              </button>
            </div>
          </fieldset>
          <fieldset class="group">
            <legend class="legend">Vista</legend>
            <div class="chips">
              <button
                v-for="o in VIEW_OPTIONS"
                :key="o.value"
                type="button"
                :class="['v3-chip', { 'v3-chip--on': view.state.viewMode === o.value }]"
                :aria-pressed="view.state.viewMode === o.value"
                @click="view.state.viewMode = o.value"
              >
                {{ o.label }}
              </button>
            </div>
          </fieldset>
          <fieldset v-for="g in groups" :key="g.key" class="group">
            <legend class="legend">{{ g.title }}</legend>
            <div class="chips">
              <button
                v-for="o in g.options"
                :key="o.value"
                type="button"
                :class="['v3-chip', { 'v3-chip--on': view.state[g.key] === o.value }]"
                :aria-pressed="view.state[g.key] === o.value"
                @click="toggle(g.key, o.value)"
              >
                <Icon v-if="view.state[g.key] === o.value" name="lucide:check" size="14" />{{ o.label }}
              </button>
            </div>
          </fieldset>
        </div>

        <div class="foot">
          <button v-if="view.hasActiveFilters" type="button" class="v3-btn clear" @click="view.clearFilters">Limpiar</button>
          <button type="button" class="v3-btn v3-btn--primary see" @click="open = false">
            Ver {{ count }} {{ count === 1 ? 'café' : 'cafés' }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.body { flex: 1; overflow-y: auto; padding: 8px 20px 16px; display: flex; flex-direction: column; gap: 22px; }
.group { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.legend { padding: 0 0 10px; font: 600 13px/16px var(--font-sans); color: var(--ink); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.foot { display: flex; gap: 10px; padding: 14px 20px calc(20px + env(safe-area-inset-bottom)); border-top: 1px solid var(--line); }
.clear { background: transparent; color: var(--ink); }
.clear:hover { background: var(--surface); }
.see { flex: 1; }
</style>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { Coffee } from '~/types'
import type { CoffeeSortBy, CoffeeViewMode } from '~/stores/coffeeView'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const view = useCoffeeViewStore()
const coffeesStore = useCoffeesStore()
const roastersStore = useRoastersStore()
const { processOptions, varieties } = useCatalog()

onMounted(() => {
  if (roastersStore.list.length === 0) roastersStore.loadAll().catch(() => {})
})

const SORT_OPTIONS: { value: CoffeeSortBy; label: string }[] = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'nameAsc', label: 'Nombre A–Z' },
  { value: 'scaDesc', label: 'SCA más alto' },
  { value: 'priceAsc', label: 'Precio menor' },
  { value: 'priceDesc', label: 'Precio mayor' },
]

const VIEW_OPTIONS: { value: CoffeeViewMode; label: string }[] = [
  { value: 'detailed', label: 'Detallado' },
  { value: 'medium', label: 'Intermedio' },
  { value: 'compact', label: 'Compacto' },
]

// Sólo mostrar como filtros los valores que efectivamente existen en la
// colección — evita ofrecer "filtrar por país Brasil" si no hay ninguno.
const countriesInUse = computed<string[]>(() => {
  const set = new Set<string>()
  for (const c of coffeesStore.list as Coffee[]) {
    if (c.originCountry) set.add(c.originCountry)
  }
  return [...set].sort()
})

const roastersInUse = computed(() => {
  const set = new Set<string>()
  for (const c of coffeesStore.list as Coffee[]) {
    if (c.roasterId) set.add(c.roasterId)
  }
  return roastersStore.list.filter(r => set.has(r.id))
})

function toggleProcess(value: string) {
  view.state.process = view.state.process === value ? null : value
}
function toggleVariety(value: string) {
  view.state.variety = view.state.variety === value ? null : value
}
function toggleRoaster(value: string) {
  view.state.roasterId = view.state.roasterId === value ? null : value
}
function toggleCountry(value: string) {
  view.state.country = view.state.country === value ? null : value
}
</script>

<template>
  <UiBottomSheet
    :model-value="modelValue"
    title="Filtros y vista"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-xl pt-xs">
      <section class="flex flex-col gap-xs">
        <UiEyebrow>Ordenar por</UiEyebrow>
        <div class="flex flex-wrap gap-xxs">
          <UiChip
            v-for="opt in SORT_OPTIONS"
            :key="opt.value"
            interactive
            :variant="view.state.sortBy === opt.value ? 'active' : 'default'"
            @click="view.state.sortBy = opt.value"
          >
            {{ opt.label }}
          </UiChip>
        </div>
      </section>

      <section class="flex flex-col gap-xs">
        <UiEyebrow>Vista</UiEyebrow>
        <div class="flex flex-wrap gap-xxs">
          <UiChip
            v-for="opt in VIEW_OPTIONS"
            :key="opt.value"
            interactive
            :variant="view.state.viewMode === opt.value ? 'active' : 'default'"
            @click="view.state.viewMode = opt.value"
          >
            {{ opt.label }}
          </UiChip>
        </div>
      </section>

      <section v-if="processOptions.length > 0" class="flex flex-col gap-xs">
        <UiEyebrow>Proceso</UiEyebrow>
        <div class="flex flex-wrap gap-xxs">
          <UiChip
            v-for="p in processOptions"
            :key="p.value"
            interactive
            :variant="view.state.process === p.value ? 'active' : 'default'"
            @click="toggleProcess(p.value)"
          >
            {{ p.label }}
          </UiChip>
        </div>
      </section>

      <section v-if="varieties.length > 0" class="flex flex-col gap-xs">
        <UiEyebrow>Variedad</UiEyebrow>
        <div class="flex flex-wrap gap-xxs">
          <UiChip
            v-for="v in varieties"
            :key="v"
            interactive
            :variant="view.state.variety === v ? 'active' : 'default'"
            @click="toggleVariety(v)"
          >
            {{ v }}
          </UiChip>
        </div>
      </section>

      <section v-if="roastersInUse.length > 0" class="flex flex-col gap-xs">
        <UiEyebrow>Marca</UiEyebrow>
        <div class="flex flex-wrap gap-xxs">
          <UiChip
            v-for="r in roastersInUse"
            :key="r.id"
            interactive
            :variant="view.state.roasterId === r.id ? 'active' : 'default'"
            @click="toggleRoaster(r.id)"
          >
            {{ r.name }}
          </UiChip>
        </div>
      </section>

      <section v-if="countriesInUse.length > 0" class="flex flex-col gap-xs">
        <UiEyebrow>País</UiEyebrow>
        <div class="flex flex-wrap gap-xxs">
          <UiChip
            v-for="c in countriesInUse"
            :key="c"
            interactive
            :variant="view.state.country === c ? 'active' : 'default'"
            @click="toggleCountry(c)"
          >
            {{ c }}
          </UiChip>
        </div>
      </section>

      <UiButton
        v-if="view.hasActiveFilters"
        variant="ghost"
        @click="view.clearFilters"
      >
        Limpiar filtros
      </UiButton>
    </div>
  </UiBottomSheet>
</template>

import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export type CoffeeSortBy =
  | 'recent'
  | 'nameAsc'
  | 'scaDesc'
  | 'priceAsc'
  | 'priceDesc'

export type CoffeeViewMode = 'detailed' | 'medium' | 'compact'

export interface CoffeeViewState {
  sortBy: CoffeeSortBy
  process: string | null
  variety: string | null
  roasterId: string | null
  country: string | null
  viewMode: CoffeeViewMode
}

const DEFAULT_STATE: CoffeeViewState = {
  sortBy: 'recent',
  process: null,
  variety: null,
  roasterId: null,
  country: null,
  viewMode: 'detailed',
}

/**
 * Vista persistida del listado de cafés: orden, filtros y densidad de cards.
 * Se persiste en localStorage por dispositivo (no en Firestore — es preferencia
 * de UI y no vale la pena consumir lecturas del free tier).
 */
export const useCoffeeViewStore = defineStore('coffeeView', () => {
  const state = useLocalStorage<CoffeeViewState>('sorbo:coffees:view', DEFAULT_STATE, {
    mergeDefaults: true,
  })

  const hasActiveFilters = computed(
    () =>
      !!state.value.process
      || !!state.value.variety
      || !!state.value.roasterId
      || !!state.value.country,
  )

  const activeFilterCount = computed(() => {
    let n = 0
    if (state.value.process) n++
    if (state.value.variety) n++
    if (state.value.roasterId) n++
    if (state.value.country) n++
    return n
  })

  function clearFilters() {
    state.value.process = null
    state.value.variety = null
    state.value.roasterId = null
    state.value.country = null
  }

  function resetAll() {
    state.value = { ...DEFAULT_STATE }
  }

  return {
    state,
    hasActiveFilters,
    activeFilterCount,
    clearFilters,
    resetAll,
  }
})

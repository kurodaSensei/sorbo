<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Coffee, Tasting, WishlistItem } from '~/types'
import { ratingToScore } from '~/utils/score'

// Mis cafés v2 (design/v2/prototipo, MisCafes): buscador y tres filtros.
// «Quiero probar» es la antigua wishlist: cafés de otros que aún no son tuyos.
definePageMeta({ hideTabBar: true })

type Filter = 'recent' | 'fav' | 'wish'

const route = useRoute()
const router = useRouter()
const coffeesStore = useCoffeesStore()
const tastingsStore = useTastingsStore()
const wishlistStore = useWishlistStore()
const ui = useUiStore()
const { getProcessLabel } = useCatalog()

const filter = ref<Filter>(route.query.f === 'wish' ? 'wish' : route.query.f === 'fav' ? 'fav' : 'recent')
const q = ref('')

onMounted(() => {
  if (!coffeesStore.list.length) coffeesStore.loadAll().catch(() => {})
  if (!tastingsStore.list.length) tastingsStore.loadAll().catch(() => {})
  if (!wishlistStore.list.length) wishlistStore.loadAll().catch(() => {})
})

const norm = (s?: string) => (s || '').toLowerCase()
const matches = (name: string, brand?: string) => `${norm(name)} ${norm(brand)}`.includes(q.value.trim().toLowerCase())

const rows = computed(() => (coffeesStore.list as Coffee[]).map((c) => {
  const notes = (tastingsStore.list as Tasting[]).filter(t => t.coffeeId === c.id)
  const avgRating = notes.length ? notes.reduce((a, t) => a + (t.ratingOverall || 0), 0) / notes.length : 0
  return {
    c,
    notes: notes.length,
    avgRating,
    flavors: [...new Set(notes.flatMap(t => t.flavorNotes ?? []).concat(c.flavorNotes ?? []))],
    eyebrow: [c.process && c.process !== 'other' ? getProcessLabel(c.process) : '', c.originRegion || c.originCountry].filter(Boolean).join(' · '),
  }
}))

// Favoritos: cafés con promedio «Muy rico» o mejor, o con una nota marcada favorita.
const shown = computed(() => {
  const list = filter.value === 'fav'
    ? rows.value.filter(r => ratingToScore(r.avgRating) >= 4 || (tastingsStore.list as Tasting[]).some(t => t.coffeeId === r.c.id && t.isFavorite))
    : rows.value
  return list.filter(r => matches(r.c.name, r.c.roasterName))
})

const wishes = computed(() => (wishlistStore.list as WishlistItem[])
  .filter(w => w.status === 'pending' && matches(w.coffeeName, w.roasterName)))
const wishCount = computed(() => (wishlistStore.list as WishlistItem[]).filter(w => w.status === 'pending').length)

function back() {
  if (window.history.length > 1) router.back()
  else router.replace('/app/yo')
}
</script>

<template>
  <div class="mc">
    <header class="mc-head">
      <button type="button" class="mc-icon" aria-label="Volver" @click="back">
        <AppIcon name="right" :size="22" :stroke="2" style="transform: rotate(180deg)" />
      </button>
      <h1 class="mc-title">Mis cafés</h1>
      <NuxtLink to="/app/coffees/new" class="mc-icon" aria-label="Registrar un café">
        <AppIcon name="plus" :size="22" :stroke="2" />
      </NuxtLink>
    </header>

    <label class="mc-search">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input v-model="q" type="search" placeholder="Buscar café o marca" aria-label="Buscar café o marca">
    </label>

    <div class="mc-chips" role="group" aria-label="Filtro">
      <button type="button" :aria-pressed="filter === 'recent'" @click="filter = 'recent'">Recientes</button>
      <button type="button" :aria-pressed="filter === 'fav'" @click="filter = 'fav'">Favoritos</button>
      <button type="button" :aria-pressed="filter === 'wish'" @click="filter = 'wish'">Quiero probar · {{ wishCount }}</button>
    </div>

    <div v-if="filter === 'wish'" class="mc-list">
      <NoteCard
        v-for="w in wishes"
        :key="w.id"
        :coffee-id="w.id"
        eyebrow="Quiero probar"
        :name="w.coffeeName"
        :brand="w.roasterName"
        :extra="w.notes"
      >
        <template #action>
          <button type="button" class="mc-anotar" @click="ui.openNoteSheet(null, { name: w.coffeeName, brand: w.roasterName })">Anotar</button>
        </template>
      </NoteCard>
      <p v-if="!wishes.length" class="mc-empty">
        {{ q ? 'Ningún café de tu lista coincide.' : 'Tu lista está vacía. Toca «Quiero probarlo» en una nota de Amigos para guardarla aquí.' }}
      </p>
    </div>

    <div v-else class="mc-list">
      <NoteCard
        v-for="r in shown"
        :key="r.c.id"
        :to="`/app/coffees/${r.c.id}`"
        :coffee-id="r.c.id"
        :eyebrow="r.eyebrow"
        :name="r.c.name"
        :brand="r.c.roasterName"
        :flavors="r.flavors"
        :extra="r.notes ? `${r.notes} ${r.notes === 1 ? 'nota' : 'notas'}` : ''"
        :rating="r.avgRating"
        empty-score="sin notas"
      />
      <p v-if="!shown.length && coffeesStore.list.length" class="mc-empty">
        {{ q ? 'Ningún café coincide con la búsqueda.' : 'Aún no tienes favoritos: aparecen los cafés con promedio «Muy rico» o mejor.' }}
      </p>
      <p v-if="!coffeesStore.list.length && !coffeesStore.loading" class="mc-empty">
        Tus cafés aparecen aquí al anotarlos. También puedes registrar una bolsa con el botón +.
      </p>
    </div>
  </div>
</template>

<style scoped>
.mc { max-width: 640px; margin: 0 auto; padding: 12px 16px 32px; display: flex; flex-direction: column; gap: 12px; color: var(--ink); font-family: var(--font-sans); }
.mc-head { display: flex; align-items: center; gap: 4px; margin: 0 -8px; }
.mc-title { flex: 1; margin: 0; font: 400 28px/30px var(--font-display); }
.mc-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.mc-search { display: flex; align-items: center; gap: 10px; height: var(--field-height); padding: 0 14px; border-radius: var(--radius-sm); background: var(--surface); color: var(--ink-soft); }
.mc-search input { flex: 1; min-width: 0; border: 0; background: transparent; font: 400 16px/22px var(--font-sans); color: var(--ink); outline: none; }
.mc-search:focus-within { box-shadow: 0 0 0 2px var(--primary); }
.mc-chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
.mc-chips button { height: var(--chip-height); padding: 0 14px; border-radius: 99px; background: var(--surface); font: 400 14px/1 var(--font-sans); white-space: nowrap; flex-shrink: 0; }
.mc-chips button[aria-pressed='true'] { background: var(--primary); color: var(--on-primary); }
.mc-list { display: flex; flex-direction: column; gap: 10px; }
.mc-empty { margin: 16px 0; font-size: 14px; line-height: 20px; color: var(--ink-soft); }
.mc-anotar { height: 36px; padding: 0 14px; border-radius: 10px; background: var(--primary); color: var(--on-primary); font: 600 13px/1 var(--font-sans); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>

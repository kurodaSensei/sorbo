<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Recipe, Tasting } from '~/types'
import { fmtSeconds } from '~/utils/dates'

// Preparar v2 (design/v2/prototipo, Preparar): tu receta de siempre con
// «Empezar», tus recetas y las herramientas. Cada receta abre el temporizador.

const recipesStore = useRecipesStore()
const tastingsStore = useTastingsStore()

const ready = ref(false)
onMounted(async () => {
  recipesStore.loadShared().catch(() => {})
  if (!tastingsStore.list.length) tastingsStore.loadAll().catch(() => {})
  try { await recipesStore.loadAll() }
  finally { ready.value = true }
})

const totalOf = (r: Recipe) => r.steps?.length ? Math.max(...r.steps.map(s => s.timeSeconds)) : 0
const summary = (r: Recipe) => [`${r.dose} g`, `${r.water} ml`, r.waterTemp && `${r.waterTemp} °C`, totalOf(r) && fmtSeconds(totalOf(r))].filter(Boolean).join(' · ')

// La de siempre: la receta más usada en tus notas; si no hay, la más reciente.
const ordered = computed(() => {
  const uses = new Map<string, number>()
  for (const t of tastingsStore.list as Tasting[]) {
    if (t.recipeName) uses.set(t.recipeName, (uses.get(t.recipeName) ?? 0) + 1)
  }
  return [...(recipesStore.list as Recipe[])].sort((a, b) =>
    (uses.get(b.name) ?? 0) - (uses.get(a.name) ?? 0)
    || (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
})
const usual = computed(() => ordered.value[0] ?? null)
const rest = computed(() => ordered.value.slice(1))
const shared = computed(() => recipesStore.sharedList as Recipe[])
</script>

<template>
  <div class="pr">
    <header class="pr-head">
      <h1 class="pr-title">Preparar</h1>
      <NuxtLink to="/app/recipes/new" class="pr-icon" aria-label="Nueva receta">
        <AppIcon name="plus" :size="22" :stroke="2" />
      </NuxtLink>
    </header>

    <section v-if="usual" class="pr-hero">
      <span class="pr-cap">Tu receta de siempre</span>
      <span class="pr-hero-name">{{ usual.name }}</span>
      <span class="pr-mono">{{ summary(usual) }}</span>
      <NuxtLink :to="`/app/timer?receta=${usual.id}`" class="pr-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3l14 9-14 9z" /></svg>
        Empezar
      </NuxtLink>
    </section>
    <section v-else-if="ready" class="pr-hero">
      <span class="pr-hero-name">Guarda tu primera receta</span>
      <span class="pr-cap">Dosis, agua y los tiempos de cada vertido. Luego la sigues con el temporizador.</span>
      <NuxtLink to="/app/recipes/new" class="pr-btn">Crear receta</NuxtLink>
    </section>

    <section v-if="rest.length" class="pr-group">
      <h2 class="pr-label">Mis recetas</h2>
      <div class="pr-list">
        <NuxtLink v-for="r in rest" :key="r.id" :to="`/app/timer?receta=${r.id}`" class="pr-row">
          <span class="pr-col"><span>{{ r.name }}</span><span class="pr-mono pr-soft">{{ summary(r) }}</span></span>
          <span class="pr-soft">›</span>
        </NuxtLink>
      </div>
    </section>

    <section v-if="shared.length" class="pr-group">
      <h2 class="pr-label">Compartidas contigo</h2>
      <div class="pr-list">
        <NuxtLink v-for="r in shared" :key="r.id" :to="`/app/timer?receta=${r.id}`" class="pr-row">
          <span class="pr-col"><span>{{ r.name }}</span><span class="pr-mono pr-soft">{{ summary(r) }}</span></span>
          <span class="pr-soft">›</span>
        </NuxtLink>
      </div>
    </section>

    <section class="pr-group">
      <h2 class="pr-label">Herramientas</h2>
      <div class="pr-list">
        <NuxtLink to="/app/timer" class="pr-row">
          <span class="pr-ic"><AppIcon name="timer" :size="20" /><span>Temporizador libre</span></span>
          <span class="pr-soft">›</span>
        </NuxtLink>
        <NuxtLink to="/app/vertido" class="pr-row">
          <span class="pr-ic"><AppIcon name="drop" :size="20" /><span class="pr-col"><span>El Vertido</span><span class="pr-cap">Preparación guiada paso a paso</span></span></span>
          <span class="pr-soft">›</span>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pr { max-width: 640px; margin: 0 auto; padding: 20px 16px 24px; display: flex; flex-direction: column; gap: 22px; color: var(--ink); font-family: var(--font-sans); }
.pr-head { display: flex; align-items: center; justify-content: space-between; }
.pr-title { margin: 0; font: 400 34px/36px var(--font-display); letter-spacing: -0.01em; }
.pr-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.pr-hero { padding: 16px; border-radius: var(--radius-xl); background: var(--surface); display: flex; flex-direction: column; gap: 8px; }
.pr-hero-name { font: 400 24px/28px var(--font-display); }
.pr-cap { font-size: 13px; line-height: 18px; color: var(--ink-soft); }
.pr-mono { font: 500 13px/18px var(--font-mono); }
.pr-soft { color: var(--ink-soft); }
.pr-btn { margin-top: 6px; height: 48px; border-radius: var(--radius-md); background: var(--primary); color: var(--on-primary); display: flex; align-items: center; justify-content: center; gap: 8px; font: 600 15px/20px var(--font-sans); }
.pr-group { display: flex; flex-direction: column; }
.pr-label { margin: 0 0 6px; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.pr-list { border-radius: var(--radius-md); background: var(--surface); display: flex; flex-direction: column; }
.pr-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px; padding: 8px 14px; font-size: 15px; color: var(--ink); }
.pr-row + .pr-row { border-top: 1px solid var(--line); }
.pr-col { display: flex; flex-direction: column; gap: 2px; }
.pr-ic { display: flex; align-items: center; gap: 12px; }
a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>

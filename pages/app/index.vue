<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Tasting } from '~/types'
import { dayLabel, hourLabel, toDate } from '~/utils/dates'

// Diario v2: la home es la línea de tiempo de tus notas, agrupada por día.
// Sin estadísticas ni checklist: la única acción es anotar.

const tastingsStore = useTastingsStore()
const ui = useUiStore()
const { getBrewMethodLabel } = useCatalog()

const ready = ref(false)
onMounted(async () => {
  try { await tastingsStore.loadAll() }
  finally { ready.value = true }
})

const groups = computed(() => {
  const out: { day: string, items: { t: Tasting, eyebrow: string }[] }[] = []
  for (const t of tastingsStore.list as Tasting[]) {
    const d = toDate(t.brewDate) || toDate(t.createdAt)
    const day = d ? dayLabel(d) : 'Sin fecha'
    const hour = d ? hourLabel(d) : ''
    const method = t.brewMethod && t.brewMethod !== 'other' ? getBrewMethodLabel(t.brewMethod) : ''
    let g = out.find(x => x.day === day)
    if (!g) out.push(g = { day, items: [] })
    g.items.push({ t, eyebrow: [method, hour].filter(Boolean).join(' · ') })
  }
  return out
})
</script>

<template>
  <div class="diario">
    <header class="d-head">
      <h1 class="d-title">Diario</h1>
      <UiNotificationBell size="md" class="lg:hidden" />
    </header>

    <div v-if="ready && !groups.length" class="d-empty">
      <span class="d-empty-ic"><AppIcon name="cup" :size="30" /></span>
      <h2 class="d-empty-t">Tu diario empieza<br>con una taza</h2>
      <p class="d-empty-p">Anota el café que estás tomando hoy. Basta con el nombre y qué tal te supo.</p>
      <button type="button" class="d-btn" @click="ui.openNoteSheet()">Anotar mi primera taza</button>
      <NuxtLink to="/app/friends" class="d-link">Invitar a un amigo</NuxtLink>
      <UiPwaInstallBanner class="d-install" />
    </div>

    <div v-else class="d-stack">
      <button type="button" class="d-brand" @click="ui.openNoteSheet()">
        <span class="d-brand-ic"><AppIcon name="cup" :size="24" :stroke="2" /></span>
        <span class="d-brand-t">
          <span class="d-brand-h">¿Qué estás tomando hoy?</span>
          <span class="d-brand-s">Anótalo en 20 segundos</span>
        </span>
        <AppIcon name="right" :size="20" :stroke="2" />
      </button>

      <section v-for="g in groups" :key="g.day" class="d-day">
        <h2 class="d-day-h">{{ g.day }}</h2>
        <NoteCard
          v-for="{ t, eyebrow } in g.items"
          :key="t.id"
          :to="`/app/tastings/${t.id}`"
          :coffee-id="t.coffeeId"
          :eyebrow="eyebrow"
          :name="t.coffeeName"
          :brand="t.roasterName"
          :flavors="t.flavorNotes"
          :quote="t.personalNotes"
          :rating="t.ratingOverall"
        />
      </section>
    </div>
  </div>
</template>

<style scoped>
.diario { max-width: 640px; margin: 0 auto; padding: 20px 16px 24px; color: var(--ink); font-family: var(--font-sans); }
.d-head { display: flex; align-items: center; justify-content: space-between; min-height: 44px; margin-bottom: 12px; }
.d-title { margin: 0; font: 400 34px/36px var(--font-display); letter-spacing: -0.01em; }
.d-stack { display: flex; flex-direction: column; gap: 20px; }
.d-brand { display: flex; align-items: center; gap: 14px; width: 100%; padding: 16px; border-radius: var(--radius-xl); background: var(--action-bg); color: var(--on-action); text-align: left; }
.d-brand-ic { width: 48px; height: 48px; border-radius: 14px; background: var(--action-fg); color: var(--action-bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.d-brand-t { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.d-brand-h { font: 600 16px/20px var(--font-sans); }
.d-brand-s { font-size: 13px; opacity: 0.72; }
.d-day { display: flex; flex-direction: column; gap: 10px; }
.d-day-h { margin: 0; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.d-empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding-top: 40px; text-align: center; }
.d-empty-ic { width: 72px; height: 72px; border-radius: 22px; background: var(--action-bg); color: var(--action-fg); display: flex; align-items: center; justify-content: center; }
.d-empty-t { margin: 0; font: 400 28px/31px var(--font-display); }
.d-empty-p { margin: 0; max-width: 300px; font-size: 15px; line-height: 22px; color: var(--ink-soft); }
.d-btn { width: 100%; max-width: 360px; height: var(--button-height); border-radius: var(--radius-md); background: var(--primary); color: var(--on-primary); font: 600 16px/20px var(--font-sans); }
.d-link { min-height: var(--touch-min); display: flex; align-items: center; font-weight: 500; color: var(--primary-pressed); }
.d-install { width: 100%; text-align: left; margin-top: 24px; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>

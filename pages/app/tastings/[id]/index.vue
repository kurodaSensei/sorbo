<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Tasting, Visibility } from '~/types'
import { coffeeTint, ratingToScore, scoreWord } from '~/utils/score'
import { dayLabel, fmtSeconds, hourLabel, toDate } from '~/utils/dates'

// Detalle de nota v2 (design/v2/prototipo, NoteDetail) con el puntaje de la
// variante A: número grande bajo el nombre, nunca encima del círculo.
definePageMeta({ hideTabBar: true })

const route = useRoute()
const router = useRouter()
const { userId } = useAuth()
const tastingsStore = useTastingsStore()
const ui = useUiStore()
const { getBrewMethodLabel } = useCatalog()
const { confirm } = useConfirm()

const id = computed(() => route.params.id as string)
const tasting = ref<Tasting | null>(null)
const loading = ref(true)
const notFound = ref(false)

const isOwner = computed(() => !!tasting.value && tasting.value.userId === userId.value)

onMounted(async () => {
  try {
    await tastingsStore.loadById(id.value)
    tasting.value = tastingsStore.current as Tasting | null
    if (!tasting.value) notFound.value = true
    else if (!tastingsStore.list.length) tastingsStore.loadAll().catch(() => {})
  }
  catch {
    notFound.value = true
  }
  finally {
    loading.value = false
  }
})

const when = computed(() => {
  const d = toDate(tasting.value?.brewDate) || toDate(tasting.value?.createdAt)
  return d ? `${dayLabel(d)}, ${hourLabel(d)}` : ''
})
const score = computed(() => ratingToScore(tasting.value?.ratingOverall))
const word = computed(() => scoreWord(tasting.value?.ratingOverall).toLowerCase())

const details = computed(() => {
  const t = tasting.value
  if (!t) return []
  const out: { label: string, value: string, mono?: boolean }[] = []
  if (t.brewMethod && t.brewMethod !== 'other') out.push({ label: 'Método', value: getBrewMethodLabel(t.brewMethod) })
  if (t.dose || t.water) out.push({ label: 'Dosis', value: [t.dose && `${t.dose} g`, t.water && `${t.water} ml`].filter(Boolean).join(' · '), mono: true })
  if (t.brewTime) out.push({ label: 'Tiempo', value: fmtSeconds(t.brewTime), mono: true })
  else if (t.ratio) out.push({ label: 'Ratio', value: t.ratio, mono: true })
  return out
})

// Catas de v1 con atributos (aroma, acidez…) en escala 1–10.
const attributes = computed(() => {
  const t = tasting.value
  if (!t) return []
  return ([
    ['Aroma', t.ratingAroma], ['Acidez', t.ratingAcidity], ['Dulzura', t.ratingSweetness],
    ['Cuerpo', t.ratingBody], ['Retrogusto', t.ratingAftertaste],
  ] as [string, number | undefined][]).filter(([, v]) => typeof v === 'number')
})

const sameCoffee = computed(() => {
  const t = tasting.value
  if (!t || !isOwner.value) return null
  const all = (tastingsStore.list as Tasting[]).filter(x => x.coffeeId === t.coffeeId)
  if (!all.length) return null
  const avg = all.reduce((a, x) => a + ratingToScore(x.ratingOverall), 0) / all.length
  return { count: all.length, avg: avg.toFixed(1).replace('.0', '') }
})

const visibilityLabel = computed(() => {
  const v = tasting.value?.visibility
  if (v === 'community') return 'Pública en Descubrir'
  if (v === 'friends') return 'Compartida con tus amigos'
  return 'Solo tú la ves'
})

// ─── Acciones ──────────────────────────────────────────────────────────────
const shareOpen = ref(false)

function onShareSaved(visibility: Visibility, uids: string[]) {
  if (tasting.value) tasting.value = { ...tasting.value, visibility, sharedWith: uids }
}

function repeat() {
  if (tasting.value) ui.openNoteSheet(tasting.value.coffeeId)
}

function back() {
  if (window.history.length > 1) router.back()
  else router.replace('/app')
}

async function onDelete() {
  if (!tasting.value) return
  const ok = await confirm({
    title: 'Eliminar nota',
    message: `La nota de «${tasting.value.coffeeName}» se borrará. No se puede deshacer.`,
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  try {
    await tastingsStore.remove(tasting.value.id)
    router.replace('/app')
  }
  catch { /* el store ya mostró el aviso */ }
}
</script>

<template>
  <div class="nd">
    <div v-if="loading" class="nd-state"><span class="nd-spin" aria-label="Cargando" /></div>

    <div v-else-if="notFound || !tasting" class="nd-state">
      <p>No encontramos esta nota.</p>
      <NuxtLink to="/app" class="nd-btn nd-secondary">Volver al Diario</NuxtLink>
    </div>

    <template v-else>
      <div class="nd-mood" :style="{ '--tint': coffeeTint(tasting.coffeeId) }">
        <div class="nd-bar">
          <button type="button" class="nd-icon" aria-label="Volver" @click="back">
            <AppIcon name="right" :size="22" :stroke="2" style="transform: rotate(180deg)" />
          </button>
          <UiActionMenu v-if="isOwner" aria-label="Más opciones" icon="lucide:more-horizontal">
            <UiActionMenuItem icon="lucide:pencil" @click="router.push(`/app/tastings/${tasting.id}/edit`)">Editar nota</UiActionMenuItem>
            <UiActionMenuItem icon="lucide:share-2" @click="shareOpen = true">Quién la ve</UiActionMenuItem>
            <UiActionMenuItem destructive icon="lucide:trash-2" @click="onDelete">Eliminar</UiActionMenuItem>
          </UiActionMenu>
        </div>

        <span class="nd-meta">
          <template v-if="!isOwner && tasting.authorName">Nota de {{ tasting.authorName }} · </template>
          {{ [tasting.roasterName, when].filter(Boolean).join(' · ') }}
        </span>
        <NuxtLink v-if="isOwner" :to="`/app/coffees/${tasting.coffeeId}`" class="nd-name">
          {{ tasting.coffeeName }}<AppIcon name="right" :size="22" :stroke="2" />
        </NuxtLink>
        <h1 v-else class="nd-name">{{ tasting.coffeeName }}</h1>

        <div v-if="score" class="nd-score">
          <span class="nd-num">{{ score }}</span><span class="nd-word">{{ word }}</span>
        </div>
      </div>

      <div class="nd-body">
        <div v-if="tasting.flavorNotes?.length" class="nd-chips">
          <span v-for="f in tasting.flavorNotes" :key="f" class="nd-chip">{{ f }}</span>
        </div>

        <p v-if="tasting.personalNotes" class="nd-quote">“{{ tasting.personalNotes }}”</p>

        <div v-if="details.length" class="nd-grid" :style="{ gridTemplateColumns: `repeat(${details.length}, minmax(0, 1fr))` }">
          <div v-for="d in details" :key="d.label">
            <span class="nd-cap">{{ d.label }}</span>
            <span :class="d.mono ? 'nd-mono' : 'nd-strong'">{{ d.value }}</span>
          </div>
        </div>

        <div v-if="attributes.length" class="nd-attrs">
          <span class="nd-label">Atributos</span>
          <span v-for="[label, value] in attributes" :key="label" class="nd-attr">
            <span>{{ label }}</span><span class="nd-mono">{{ value }}/10</span>
          </span>
        </div>

        <NuxtLink v-if="sameCoffee" :to="`/app/coffees/${tasting.coffeeId}`" class="nd-row">
          <span class="nd-col">
            <span class="nd-strong">Todas tus notas de este café</span>
            <span class="nd-cap">{{ sameCoffee.count }} {{ sameCoffee.count === 1 ? 'nota' : 'notas' }} · promedio {{ sameCoffee.avg }}</span>
          </span>
          <AppIcon name="right" :size="20" />
        </NuxtLink>

        <span v-if="isOwner" class="nd-cap nd-vis">
          <AppIcon name="users" :size="16" />{{ visibilityLabel }}
        </span>
      </div>

      <footer v-if="isOwner" class="nd-foot">
        <button type="button" class="nd-btn nd-primary" @click="repeat">
          <AppIcon name="plus" :size="18" :stroke="2" />Repetir
        </button>
        <button type="button" class="nd-btn nd-secondary" @click="shareOpen = true">
          <AppIcon name="users" :size="18" :stroke="2" />Compartir
        </button>
      </footer>

      <UiShareSheet
        v-if="isOwner"
        v-model="shareOpen"
        :entity-name="`nota de ${tasting.coffeeName}`"
        entity-kind="tasting"
        :initial-visibility="tasting.visibility ?? 'private'"
        :initial-shared-with="tasting.sharedWith ?? []"
        :on-save="(visibility, uids) => tastingsStore.updateVisibility(tasting!.id, visibility, uids)"
        @saved="onShareSaved"
      />
    </template>
  </div>
</template>

<style scoped>
.nd { max-width: 640px; margin: 0 auto; min-height: 100svh; padding-bottom: calc(96px + env(safe-area-inset-bottom)); color: var(--ink); font-family: var(--font-sans); background: var(--bg); }
.nd-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 120px 16px; color: var(--ink-soft); }
.nd-spin { width: 24px; height: 24px; border-radius: 99px; border: 2px solid var(--line); border-top-color: var(--ink); animation: nd-spin 0.8s linear infinite; }
@keyframes nd-spin { to { transform: rotate(360deg); } }
.nd-mood { position: relative; overflow: hidden; isolation: isolate; padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 8px; }
.nd-mood::before { content: ''; position: absolute; top: -64px; right: -64px; width: 170px; height: 170px; border-radius: 99px; background: var(--tint); opacity: 0.7; z-index: -1; }
.nd-bar { display: flex; justify-content: space-between; align-items: center; margin: 0 -8px 8px; }
.nd-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 99px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
/* La línea de datos queda a la altura del círculo: se reserva su ancho. */
.nd-meta { font-size: 13px; color: var(--ink-soft); padding-right: 104px; }
.nd-name { display: inline-flex; align-items: center; gap: 4px; margin: 0; font: 400 32px/34px var(--font-display); letter-spacing: -0.01em; color: var(--ink); max-width: 80%; }
.nd-score { display: flex; align-items: baseline; gap: 8px; margin-top: 4px; }
.nd-num { font: 400 44px/40px var(--font-display); letter-spacing: -0.02em; }
.nd-word { font: italic 400 18px/22px var(--font-display); color: var(--ink-soft); }
.nd-body { padding: 4px 16px 0; display: flex; flex-direction: column; gap: 18px; }
.nd-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.nd-chip { font-size: 13px; padding: 6px 12px; border-radius: 99px; background: var(--surface); }
.nd-quote { margin: 0; font: italic 400 19px/26px var(--font-display); }
.nd-grid { display: grid; gap: 1px; background: var(--line); border-radius: var(--radius-md); overflow: hidden; }
.nd-grid > div { background: var(--surface); padding: 12px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.nd-cap { font-size: 12px; line-height: 16px; color: var(--ink-soft); }
.nd-strong { font: 600 15px/22px var(--font-sans); }
.nd-mono { font: 500 14px/20px var(--font-mono); }
.nd-label { font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.nd-attrs { display: flex; flex-direction: column; gap: 6px; }
.nd-attr { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; border-bottom: 1px solid var(--line); }
.nd-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 56px; border-bottom: 1px solid var(--line); color: var(--ink); }
.nd-col { display: flex; flex-direction: column; gap: 2px; }
.nd-vis { display: flex; align-items: center; gap: 8px; }
.nd-foot { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 12px 16px calc(16px + env(safe-area-inset-bottom)); background: var(--bg); border-top: 1px solid var(--line); max-width: 640px; margin: 0 auto; }
.nd-btn { height: var(--button-height); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 8px; font: 600 15px/20px var(--font-sans); padding: 0 16px; }
.nd-primary { background: var(--primary); color: var(--on-primary); }
.nd-secondary { background: var(--surface); color: var(--ink); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media (min-width: 1024px) {
  .nd-foot { left: 260px; }
}
</style>

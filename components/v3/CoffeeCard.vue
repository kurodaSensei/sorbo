<script setup lang="ts">
// Tarjeta editorial de café v3: círculo tenue del color del proceso, puntaje a la derecha.
import type { Coffee } from '~/types'
import type { CoffeeViewMode } from '~/stores/coffeeView'

// preview: sin enlace, para la vista previa de «Nuevo café».
const props = withDefaults(defineProps<{ coffee: Coffee, mode?: CoffeeViewMode, tastings?: number, preview?: boolean }>(), { mode: 'detailed' })
const NuxtLink = resolveComponent('NuxtLink')

const { getProcessLabel } = useCatalog()

// Natural en miel, lavado en salvia, el resto en miel suave.
const blob = computed(() => {
  switch (props.coffee.process) {
    case 'natural': return 'blob--natural'
    case 'washed': case 'experimental': return 'blob--washed'
    case 'other': case undefined: return 'blob--plain'
    default: return 'blob--soft'
  }
})

const eyebrow = computed(() => {
  const proc = props.coffee.process ? getProcessLabel(props.coffee.process) : ''
  if (props.mode === 'compact') return proc
  return [proc, props.coffee.originRegion].filter(Boolean).join(' · ')
})

const name = computed(() => {
  const n = props.coffee.name?.trim() || 'Sin nombre'
  return n.endsWith('.') ? n.slice(0, -1) : n
})
const roaster = computed(() => props.coffee.roasterName?.trim().replace(/\.$/, '') || '')

const detailed = computed(() => props.mode === 'detailed')
const notes = computed(() => (props.coffee.flavorNotes || []).slice(0, props.mode === 'compact' ? 2 : 3))
const moreNotes = computed(() => Math.max(0, (props.coffee.flavorNotes || []).length - notes.value.length))

const meta = computed(() => {
  const c = props.coffee
  const parts: string[] = []
  if (c.price) parts.push(new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(c.price))
  if (c.weight) parts.push(`${c.weight} g`)
  return parts.join(' · ')
})
const tastingsText = computed(() => {
  if (props.tastings === undefined) return ''
  return props.tastings === 0 ? 'Sin catas' : `${props.tastings} ${props.tastings === 1 ? 'cata' : 'catas'}`
})
</script>

<template>
  <component
    :is="preview ? 'div' : NuxtLink"
    :to="preview ? undefined : `/app/coffees/${coffee.id}`"
    :class="['card', { 'card--compact': mode === 'compact', 'card--static': preview }]"
  >
    <span :class="['blob', blob]" aria-hidden="true" />
    <span class="in">
      <span class="top">
        <span class="id">
          <span v-if="eyebrow" class="v3-eyebrow eb">— {{ eyebrow }}</span>
          <span class="name">{{ name }}</span>
          <span v-if="roaster" class="roaster">de {{ roaster }}</span>
        </span>
        <span v-if="detailed && coffee.scaScore" class="score">
          <span class="score-num">{{ coffee.scaScore }}</span>
          <span class="score-lab">Score SCA</span>
        </span>
      </span>
      <span v-if="notes.length || (detailed && (meta || tastingsText))" class="bottom">
        <span class="notes">
          <span v-for="n in notes" :key="n" class="note">{{ n }}</span>
          <span v-if="moreNotes" class="note">+{{ moreNotes }}</span>
        </span>
        <span v-if="detailed && (meta || tastingsText)" class="meta">
          <span v-if="meta">{{ meta }}</span>
          <span v-if="tastingsText" class="desktop-only">{{ tastingsText }}</span>
        </span>
      </span>
    </span>
  </component>
</template>

<style scoped>
.card { position: relative; overflow: hidden; display: block; border-radius: 24px; background: var(--surface-strong); color: var(--ink); text-decoration: none; transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1); }
.card:hover:not(.card--static) { transform: translateY(-2px); }
.blob { position: absolute; right: -70px; top: -90px; width: 240px; height: 240px; border-radius: 50%; pointer-events: none; }
.blob--natural { background: var(--accent); opacity: 0.38; }
.blob--washed { background: var(--tint); opacity: 0.42; }
.blob--soft { background: var(--accent); opacity: 0.26; }
.blob--plain { background: var(--surface); opacity: 1; }
.in { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 18px 18px 16px; }
.top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.id { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.eb { color: var(--ink-soft); margin-bottom: 4px; }
.name { font: 400 26px/1.05 var(--font-display); letter-spacing: -0.01em; overflow-wrap: anywhere; }
.roaster { font: italic 400 15px/20px var(--font-display); color: var(--ink-soft); }
.score { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.score-num { font: 400 30px/1 var(--font-display); }
.score-lab { font: 400 12px/16px var(--font-sans); color: var(--ink-soft); }
.bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.notes { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.note { display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 9999px; background: color-mix(in srgb, var(--bg) 70%, transparent); font: 500 12px/16px var(--font-sans); }
.meta { flex: none; display: flex; flex-direction: column; align-items: flex-end; font: 500 12px/16px var(--font-mono); color: var(--ink-soft); }
.desktop-only { display: none; }
.card--compact .in { padding: 14px 16px; gap: 8px; }
.card--compact .name { font-size: 22px; }
@media (min-width: 1024px) {
  .blob { right: -80px; top: -110px; width: 280px; height: 280px; }
  .in { padding: 22px 22px 20px; }
  .name { font-size: 30px; }
  .roaster { font-size: 16px; line-height: 22px; }
  .score-num { font-size: 36px; }
  .desktop-only { display: inline; }
}
@media (prefers-reduced-motion: reduce) { .card { transition: none; } .card:hover { transform: none; } }
</style>

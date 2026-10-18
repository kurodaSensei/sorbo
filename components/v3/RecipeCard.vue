<script setup lang="ts">
// Tarjeta editorial de receta v3: círculo tenue del color del método, duración a la derecha.
import type { Recipe } from '~/types'

const props = defineProps<{ recipe: Recipe, preview?: boolean }>()
const NuxtLink = resolveComponent('NuxtLink')
const { getBrewMethodLabel } = useCatalog()

const r = computed(() => props.recipe)
const name = computed(() => (r.value.name || '').trim().replace(/\.+$/, '') || 'Sin nombre')
// «Desconocido» era el relleno de v1 cuando no había autor.
const author = computed(() => {
  const a = r.value.author?.trim()
  return a && a.toLowerCase() !== 'desconocido' ? a : ''
})
const stepCount = computed(() => r.value.steps?.length ?? 0)
const eyebrow = computed(() => [
  r.value.brewMethod ? getBrewMethodLabel(r.value.brewMethod) : '',
  stepCount.value ? `${stepCount.value} ${stepCount.value === 1 ? 'paso' : 'pasos'}` : '',
].filter(Boolean).join(' · '))
const total = computed(() => Math.max(0, ...(r.value.steps || []).map(s => s.timeSeconds)))
const specs = computed(() => {
  const out: { k: string, v: string }[] = []
  if (r.value.dose) out.push({ k: 'Dosis', v: `${r.value.dose} g` })
  if (r.value.ratio || (r.value.water && r.value.dose)) out.push({ k: 'Ratio', v: r.value.ratio || `1:${Math.round(r.value.water / r.value.dose)}` })
  if (r.value.waterTemp) out.push({ k: 'Temp', v: `${r.value.waterTemp}°` })
  return out
})
</script>

<template>
  <component
    :is="preview ? 'div' : NuxtLink"
    :to="preview ? undefined : `/app/recipes/${recipe.id}`"
    :class="['card', { 'card--static': preview }]"
  >
    <span class="blob" :style="methodBlobStyle(recipe.brewMethod)" aria-hidden="true" />
    <span class="in">
      <span class="top">
        <span class="id">
          <span v-if="eyebrow" class="v3-eyebrow eb">— {{ eyebrow }}</span>
          <span class="name">{{ name }}</span>
          <span v-if="author" class="author">de {{ author }}</span>
        </span>
        <span v-if="total" class="time">
          <span class="time-num">{{ formatClock(total) }}</span>
          <span class="time-lab">minutos</span>
        </span>
      </span>
      <span v-if="specs.length" class="specs">
        <span v-for="s in specs" :key="s.k" class="spec"><span class="spec-k">{{ s.k }}</span><span class="spec-v">{{ s.v }}</span></span>
      </span>
      <span v-if="recipe.bestFor" class="best">«{{ recipe.bestFor }}»</span>
    </span>
  </component>
</template>

<style scoped>
.card { position: relative; overflow: hidden; display: block; border-radius: 24px; background: var(--surface-strong); color: var(--ink); text-decoration: none; transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1); }
.card:hover:not(.card--static) { transform: translateY(-2px); }
.blob { position: absolute; right: -70px; top: -90px; width: 240px; height: 240px; border-radius: 50%; pointer-events: none; }
.in { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 18px 18px 16px; }
.top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.id { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.eb { color: var(--ink-soft); margin-bottom: 4px; }
.name { font: 400 26px/1.05 var(--font-display); letter-spacing: -0.01em; overflow-wrap: anywhere; }
.author { font: italic 400 15px/20px var(--font-display); color: var(--ink-soft); }
.time { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.time-num { font: 400 30px/1 var(--font-display); }
.time-lab { font: 400 12px/16px var(--font-sans); color: var(--ink-soft); }
.specs { display: flex; gap: 6px; flex-wrap: wrap; }
.spec { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border-radius: 12px; background: color-mix(in srgb, var(--bg) 70%, transparent); }
.spec-k { font: 400 11px/14px var(--font-sans); color: var(--ink-soft); }
.spec-v { font: 500 14px/18px var(--font-mono); }
.best { font: italic 400 15px/22px var(--font-display); color: var(--ink-soft); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
@media (min-width: 1024px) {
  .blob { right: -80px; top: -110px; width: 280px; height: 280px; }
  .in { padding: 22px 22px 20px; }
  .name { font-size: 30px; }
  .author { font-size: 16px; line-height: 22px; }
  .time-num { font-size: 36px; }
}
@media (prefers-reduced-motion: reduce) { .card { transition: none; } .card:hover:not(.card--static) { transform: none; } }
</style>

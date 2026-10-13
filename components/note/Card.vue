<script setup lang="ts">
import { computed } from 'vue'
import { coffeeTint, ratingToScore, scoreWord } from '~/utils/score'

// Tarjeta de café v2 (design/v2/components/NoteCard): encabezado mono,
// nombre en serif, «de [Marca]», sabores o cita, y el puntaje abajo a la
// derecha. El círculo de color es decorativo y nunca lleva texto encima.
const props = defineProps<{
  /** Sin destino, la tarjeta es un bloque (p. ej. con botón «Anotar»). */
  to?: string
  coffeeId?: string
  eyebrow?: string
  name: string
  brand?: string
  flavors?: string[]
  quote?: string
  rating?: number
  /** Dato extra al final de la línea de sabores («2 notas»). */
  extra?: string
  /** Texto en lugar del puntaje cuando no hay notas («sin notas»). */
  emptyScore?: string
}>()

const NuxtLink = resolveComponent('NuxtLink')
const score = computed(() => ratingToScore(props.rating))
const word = computed(() => scoreWord(props.rating).toLowerCase())
const meta = computed(() => {
  const main = props.flavors?.length ? props.flavors.slice(0, 2).join(', ') : (props.quote ? `“${props.quote}”` : '')
  return [main, props.extra].filter(Boolean).join(' · ')
})
</script>

<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" class="ncard" :class="{ 'is-link': !!to }" :style="{ '--tint': coffeeTint(coffeeId) }">
    <span class="nc-main">
      <span v-if="eyebrow" class="nc-eyebrow">— {{ eyebrow }}</span>
      <span class="nc-name">{{ name }}</span>
      <span v-if="brand" class="nc-by">de {{ brand }}</span>
      <span v-if="meta" class="nc-meta">{{ meta }}</span>
    </span>
    <span v-if="$slots.action" class="nc-action"><slot name="action" /></span>
    <span v-else-if="score" class="nc-score">
      <span class="nc-word">{{ word }}</span>
      <span class="nc-num">{{ score }}</span>
    </span>
    <span v-else-if="emptyScore" class="nc-score"><span class="nc-word">{{ emptyScore }}</span><span class="nc-num">—</span></span>
  </component>
</template>

<style scoped>
.ncard {
  position: relative; overflow: hidden; isolation: isolate;
  display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: end;
  padding: 14px 16px; border-radius: var(--radius-lg); background: var(--surface); color: var(--ink);
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.ncard::before {
  content: ''; position: absolute; right: -34px; top: -34px; width: 104px; height: 104px;
  border-radius: 99px; background: var(--tint); opacity: 0.7; z-index: -1; pointer-events: none;
}
.ncard.is-link:active { transform: scale(0.99); }
.ncard:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.nc-main { display: flex; flex-direction: column; min-width: 0; padding-right: 48px; }
.nc-eyebrow { font: 500 11px/14px var(--font-mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-soft); margin-bottom: 3px; }
.nc-name { font: 400 26px/28px var(--font-display); letter-spacing: -0.01em; }
.nc-by { font: italic 400 14px/18px var(--font-display); color: var(--ink-soft); }
.nc-meta { margin-top: 6px; font: 400 12px/16px var(--font-sans); color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nc-score { display: flex; align-items: baseline; gap: 6px; }
.nc-word { font: italic 400 15px/20px var(--font-display); color: var(--ink-soft); }
.nc-num { font: 400 36px/30px var(--font-display); letter-spacing: -0.02em; }
.nc-action { position: relative; z-index: 1; }
</style>

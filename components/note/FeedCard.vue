<script setup lang="ts">
import { computed } from 'vue'
import type { Tasting } from '~/types'
import { coffeeTint, ratingToScore, scoreWord } from '~/utils/score'
import { agoLabel, toDate } from '~/utils/dates'

// Nota de otra persona en Amigos (design/v2/prototipo, FeedCard) con el
// puntaje de la variante A: abajo a la derecha, nunca sobre el círculo.
const props = defineProps<{
  tasting: Tasting
  cheered: boolean
  cheers: number
  /** El café ya está en Quiero probar. */
  wished: boolean
  /** El café ya es tuyo: no se ofrece «Quiero probarlo». */
  owned: boolean
}>()

const emit = defineEmits<{ cheer: [], wish: [] }>()
const { getBrewMethodLabel } = useCatalog()

const author = computed(() => props.tasting.authorName || 'Alguien')
const meta = computed(() => {
  const d = toDate(props.tasting.brewDate) || toDate(props.tasting.createdAt)
  const method = props.tasting.brewMethod && props.tasting.brewMethod !== 'other' ? getBrewMethodLabel(props.tasting.brewMethod) : ''
  return [d && agoLabel(d), method].filter(Boolean).join(' · ')
})
const body = computed(() => props.tasting.personalNotes || props.tasting.flavorNotes?.join(', ') || '')
const score = computed(() => ratingToScore(props.tasting.ratingOverall))
</script>

<template>
  <article class="fc" :style="{ '--tint': coffeeTint(tasting.coffeeId) }">
    <NuxtLink :to="`/app/tastings/${tasting.id}`" class="fc-link">
      <span class="fc-head">
        <UiAvatar :name="author" :src="tasting.authorPhotoURL" size="sm" />
        <span class="fc-col">
          <span class="fc-author">{{ author }}</span>
          <span class="fc-meta">{{ meta }}</span>
        </span>
      </span>
      <span class="fc-col">
        <span class="fc-name">{{ tasting.coffeeName }}</span>
        <span v-if="body" class="fc-body">{{ body }}</span>
      </span>
    </NuxtLink>
    <div class="fc-actions">
      <button type="button" class="fc-pill" :class="{ on: cheered }" :aria-pressed="cheered" @click="emit('cheer')">
        <AppIcon name="cup" :size="16" :stroke="cheered ? 2 : 1.75" />
        {{ cheered ? `Brindaste · ${cheers}` : cheers ? `Brindar · ${cheers}` : 'Brindar' }}
      </button>
      <button v-if="!owned" type="button" class="fc-pill" :class="{ kept: wished }" :aria-pressed="wished" :disabled="wished" @click="emit('wish')">
        <svg width="16" height="16" viewBox="0 0 24 24" :fill="wished ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /></svg>
        {{ wished ? 'En tu lista' : 'Quiero probarlo' }}
      </button>
      <span v-if="score" class="fc-score">
        <span class="fc-word">{{ scoreWord(tasting.ratingOverall).toLowerCase() }}</span>
        <span class="fc-num">{{ score }}</span>
      </span>
    </div>
  </article>
</template>

<style scoped>
.fc { position: relative; overflow: hidden; isolation: isolate; padding: 14px; border-radius: var(--radius-lg); background: var(--surface); display: flex; flex-direction: column; gap: 12px; color: var(--ink); }
.fc::before { content: ''; position: absolute; top: -34px; right: -34px; width: 104px; height: 104px; border-radius: 99px; background: var(--tint); opacity: 0.7; z-index: -1; }
.fc-link { display: flex; flex-direction: column; gap: 10px; color: var(--ink); }
.fc-link:focus-visible { outline: 2px solid var(--primary); outline-offset: 4px; border-radius: 8px; }
.fc-head { display: flex; align-items: center; gap: 10px; padding-right: 64px; }
.fc-col { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fc-author { font: 600 14px/18px var(--font-sans); }
.fc-meta { font-size: 12px; line-height: 16px; color: var(--ink-soft); }
.fc-name { font: 400 19px/22px var(--font-display); }
.fc-body { font-size: 14px; line-height: 20px; }
.fc-actions { display: flex; align-items: flex-end; gap: 8px; flex-wrap: wrap; }
.fc-pill { height: 36px; padding: 0 12px; border-radius: 99px; background: var(--bg); color: var(--ink); display: flex; align-items: center; gap: 6px; font: 500 13px/1 var(--font-sans); }
.fc-pill.on { background: var(--primary); color: var(--on-primary); }
.fc-pill.kept { background: var(--bg); color: var(--ink); cursor: default; }
.fc-pill:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.fc-score { margin-left: auto; display: flex; align-items: baseline; gap: 6px; }
.fc-word { font: italic 400 15px/20px var(--font-display); color: var(--ink-soft); }
.fc-num { font: 400 32px/28px var(--font-display); letter-spacing: -0.02em; }
</style>

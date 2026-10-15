<script setup lang="ts">
import { computed } from 'vue'
import type { Coffee, CoffeeProcess } from '~/types'
import type { CoffeeViewMode } from '~/stores/coffeeView'

const props = withDefaults(
  defineProps<{
    coffee: Coffee
    /** Compact density for desktop grid cells (legacy prop). */
    compact?: boolean
    /**
     * Modo de presentación:
     *  - detailed: SCA + meta (precio · peso) + 3 notas (default)
     *  - medium:   sin SCA, sin meta, 3 notas
     *  - compact:  título + marca + 2 notas (más denso)
     */
    mode?: CoffeeViewMode
  }>(),
  {
    compact: false,
    mode: 'detailed',
  },
)

const processLabel: Record<CoffeeProcess, string> = {
  washed: 'Lavado',
  natural: 'Natural',
  honey: 'Honey',
  anaerobic: 'Anaeróbico',
  carbonic: 'Carbónico',
  experimental: 'Experimental',
  other: 'Otro',
}

const blobTone = computed<'honey' | 'olive-light' | 'surface-2' | 'peach'>(() => {
  switch (props.coffee.process) {
    case 'natural':
      return 'honey'
    case 'honey':
      return 'peach'
    case 'washed':
      return 'olive-light'
    case 'anaerobic':
    case 'carbonic':
      return 'peach'
    case 'experimental':
      return 'olive-light'
    default:
      return 'surface-2'
  }
})

const eyebrow = computed(() => {
  const proc = props.coffee.process ? processLabel[props.coffee.process] : ''
  // En modo compact se oculta la información geográfica (región) para mantener
  // la card a una sola línea de eyebrow.
  if (props.mode === 'compact') return proc
  const region = props.coffee.originRegion || ''
  return [proc, region].filter(Boolean).join(' · ')
})

const name = computed(() => {
  const n = props.coffee.name?.trim() || 'Sin nombre'
  return n.endsWith('.') ? n.slice(0, -1) : n
})

const subtitle = computed(() => {
  const r = props.coffee.roasterName?.trim()
  if (!r) return undefined
  const clean = r.endsWith('.') ? r.slice(0, -1) : r
  return `de ${clean}`
})

function formatPrice(p?: number): string {
  if (!p) return ''
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (p >= 1000) return `$${Math.round(p / 1000)}K`
  return `$${p}`
}

const showScore = computed(() => props.mode === 'detailed')
const showMeta = computed(() => props.mode === 'detailed')
// `compact` mode usa el modo denso del MoodCard.
const denseLayout = computed(() => props.compact || props.mode === 'compact')
const notesLimit = computed(() => (props.mode === 'compact' ? 2 : 3))

const meta = computed(() => {
  if (!showMeta.value) return ''
  const parts: string[] = []
  const price = formatPrice(props.coffee.price)
  if (price) parts.push(price)
  if (props.coffee.weight) parts.push(`${props.coffee.weight}g`)
  return parts.join(' · ')
})

const score = computed(() => (showScore.value ? props.coffee.scaScore : undefined))

const visibleNotes = computed(() => (props.coffee.flavorNotes || []).slice(0, notesLimit.value))
const moreNotes = computed(() =>
  Math.max(0, (props.coffee.flavorNotes || []).length - visibleNotes.value.length),
)
</script>

<template>
  <UiMoodCard
    :to="`/app/coffees/${coffee.id}`"
    :eyebrow="eyebrow"
    :name="name"
    :subtitle="subtitle"
    :score="score"
    :meta="meta"
    :blob-tone="blobTone"
    :compact="denseLayout"
  >
    <template v-if="(coffee.flavorNotes || []).length > 0" #notes>
      <UiChip v-for="n in visibleNotes" :key="n" compact>
        {{ n }}
      </UiChip>
      <UiChip v-if="moreNotes > 0" compact variant="ghost">
        +{{ moreNotes }}
      </UiChip>
    </template>
  </UiMoodCard>
</template>

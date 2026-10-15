<script setup lang="ts">
import { computed } from 'vue'
import type { Coffee } from '~/types'

// Café en el feed. Si es mío abre su detalle; el de otra persona no tiene
// página de solo lectura, así que es una tarjeta con «Quiero probarlo».
const props = defineProps<{ coffee: Coffee, own: boolean, wished: boolean }>()
const emit = defineEmits<{ wish: [] }>()
const { getProcessLabel } = useCatalog()

const eyebrow = computed(() => [
  props.coffee.process && props.coffee.process !== 'other' ? getProcessLabel(props.coffee.process) : '',
  props.coffee.originRegion || props.coffee.originCountry,
].filter(Boolean).join(' · '))
</script>

<template>
  <NoteCard
    :to="own ? `/app/coffees/${coffee.id}` : undefined"
    :coffee-id="coffee.id"
    :eyebrow="eyebrow"
    :name="coffee.name"
    :brand="coffee.roasterName"
    :flavors="coffee.flavorNotes"
    :extra="!own && coffee.authorName ? `de ${coffee.authorName}` : ''"
  >
    <template #action>
      <span v-if="own" class="fcf-own">Tuyo</span>
      <button v-else type="button" class="fcf-pill" :disabled="wished" :aria-pressed="wished" @click="emit('wish')">
        {{ wished ? 'En tu lista' : 'Quiero probarlo' }}
      </button>
    </template>
  </NoteCard>
</template>

<style scoped>
.fcf-own { font-size: 12px; line-height: 16px; color: var(--ink-soft); }
.fcf-pill { height: 44px; padding: 0 14px; border-radius: 99px; background: var(--bg); color: var(--ink); font: 500 13px/1 var(--font-sans); }
.fcf-pill:disabled { cursor: default; color: var(--ink-soft); }
.fcf-pill:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>

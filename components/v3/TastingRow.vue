<script setup lang="ts">
// Fila de cata v3: puntaje 1–5 en un recuadro de color, café, palabra · marca · método y tu nota.
const props = defineProps<{
  rating?: number | null
  name: string
  roaster?: string
  method?: string
  when?: string
  note?: string
  favorite?: boolean
  to?: string
}>()
const NuxtLink = resolveComponent('NuxtLink')
const score = computed(() => ratingToScore(props.rating))
const meta = computed(() => [scoreWord(props.rating), props.roaster ? `de ${props.roaster}` : '', props.method, props.when].filter(Boolean).join(' · '))
</script>

<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" class="row">
    <span :class="['badge', `tone-${scoreTone(rating)}`]">{{ score || '—' }}</span>
    <span class="text">
      <span class="top">
        <span class="name">{{ name }}</span>
        <Icon v-if="favorite" name="lucide:heart" size="14" mode="svg" class="fav v3-icon-fill" aria-label="Favorita" />
      </span>
      <span class="v3-meta">{{ meta }}</span>
      <span v-if="note" class="note">«{{ note }}»</span>
    </span>
    <Icon v-if="to" name="lucide:chevron-right" size="18" class="chev" />
  </component>
</template>

<style scoped>
.row { display: flex; align-items: center; gap: 14px; min-height: 76px; padding: 10px 0; color: var(--ink); text-decoration: none; }
.badge { flex: none; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font: 400 22px/1 var(--font-display); background: var(--surface-strong); }
.tone-high { background: var(--accent); color: var(--on-accent); }
.tone-good { background: var(--tint); color: var(--on-tint); }
.text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.top { display: flex; align-items: center; gap: 6px; min-width: 0; }
.name { font: 400 19px/22px var(--font-display); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fav { flex: none; color: var(--accent); }
.note { font: italic 400 14px/20px var(--font-display); color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chev { flex: none; color: var(--ink-soft); }
</style>

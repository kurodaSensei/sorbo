<script setup lang="ts">
import type { Recipe } from '~/types'

// Receta en el feed: fila simple en surface. Las mías solo se abren.
defineProps<{ recipe: Recipe, own: boolean, saved?: boolean }>()
const emit = defineEmits<{ save: [] }>()
const { getBrewMethodLabel } = useCatalog()
</script>

<template>
  <article class="fr">
    <NuxtLink :to="`/app/recipes/${recipe.id}`" class="fr-link">
      <span class="fr-name">{{ recipe.name }}</span>
      <span class="fr-meta">
        {{ recipe.authorName && !own ? `${recipe.authorName} · ` : '' }}{{ getBrewMethodLabel(recipe.brewMethod) }}
        <span class="fr-data">{{ recipe.dose }} g · {{ recipe.water }} ml</span>
      </span>
    </NuxtLink>
    <span v-if="own" class="fr-own">Tuyo</span>
    <button v-else type="button" class="fr-pill" :disabled="saved" @click="emit('save')">{{ saved ? 'Guardada' : 'Guardar' }}</button>
  </article>
</template>

<style scoped>
.fr { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: var(--radius-lg); background: var(--surface); color: var(--ink); }
.fr-link { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; color: var(--ink); }
.fr-link:focus-visible, .fr-pill:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 8px; }
.fr-name { font: 400 19px/22px var(--font-display); }
.fr-meta { font-size: 13px; line-height: 18px; color: var(--ink-soft); }
.fr-data { font-family: var(--font-mono); margin-left: 6px; }
.fr-own { font-size: 12px; line-height: 16px; color: var(--ink-soft); }
.fr-pill { height: 44px; padding: 0 14px; border-radius: 99px; background: var(--bg); font: 500 13px/1 var(--font-sans); }
.fr-pill:disabled { cursor: default; color: var(--ink-soft); }
</style>

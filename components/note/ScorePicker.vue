<script setup lang="ts">
import { SCORE_WORDS } from '~/utils/score'

// Puntaje v2 (1–5 con palabras). El v-model es el puntaje 1–5, no el rating 2–10.
const score = defineModel<number>({ default: 0 })
defineProps<{ label?: string }>()
</script>

<template>
  <fieldset class="sp">
    <legend class="sp-label">{{ label ?? '¿Qué tal estuvo?' }}</legend>
    <div>
      <button
        v-for="n in 5"
        :key="n"
        type="button"
        :aria-pressed="score === n"
        @click="score = n"
      >
        <span class="sp-num">{{ n }}</span>
        <span class="sp-word">{{ SCORE_WORDS[n] }}</span>
      </button>
    </div>
  </fieldset>
</template>

<style scoped>
.sp { border: 0; margin-inline: 0; padding: 0; } /* margin-block libre para clases desde fuera */
.sp-label { margin-bottom: 10px; padding: 0; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.sp > div { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.sp button { height: 64px; border-radius: var(--radius-md); background: var(--surface); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; transition: background 200ms; }
.sp-num { font: 400 22px/1 var(--font-display); }
.sp-word { font-size: 11px; color: var(--ink-soft); }
.sp button[aria-pressed='true'] { background: var(--action-bg); }
.sp button[aria-pressed='true'] .sp-num { color: var(--action-fg); }
.sp button[aria-pressed='true'] .sp-word { color: var(--on-action); }
</style>

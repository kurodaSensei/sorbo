<script setup lang="ts">
// Interruptor v2 (design/v2/components/Switch). Etiquétalo con aria-label o
// aria-labelledby desde fuera.
const on = defineModel<boolean>({ default: false })
defineProps<{ disabled?: boolean }>()
</script>

<template>
  <button type="button" role="switch" class="sw" :aria-checked="on" :disabled="disabled" @click="on = !on">
    <span />
  </button>
</template>

<style scoped>
.sw { width: 50px; height: 30px; border-radius: 99px; position: relative; background: var(--surface-strong); flex-shrink: 0; transition: background 200ms; }
.sw span { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 99px; background: var(--bg); transition: transform 200ms; }
.sw[aria-checked='true'] { background: var(--primary); }
.sw[aria-checked='true'] span { transform: translateX(20px); background: var(--on-primary); }
.sw:disabled { opacity: 0.5; }
.sw:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .sw, .sw span { transition: none; } }
</style>

<script setup lang="ts">
import { cn } from '~/lib/utils'

defineProps<{
  class?: string
}>()
</script>

<template>
  <div
    :class="
      cn(
        'sorbo-skeleton bg-surface-2 rounded-card-sm',
        $props.class,
      )
    "
    aria-hidden="true"
  />
</template>

<style scoped>
.sorbo-skeleton {
  /* Shimmer suave que respira con el design system (paper → surface-2). */
  background-image: linear-gradient(
    90deg,
    var(--surface-2) 0%,
    var(--surface) 50%,
    var(--surface-2) 100%
  );
  background-size: 200% 100%;
  animation: sorbo-skeleton-shimmer 1.6s ease-in-out infinite;
}

@keyframes sorbo-skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Respeta prefers-reduced-motion: sin animación, solo el surface-2 sólido. */
@media (prefers-reduced-motion: reduce) {
  .sorbo-skeleton {
    animation: none;
    background-image: none;
    background-color: var(--surface-2);
  }
}
</style>

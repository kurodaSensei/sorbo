<script setup lang="ts">
import type { InfoSheetContent } from '~/composables/useInfoSheet'

const props = defineProps<{
  info: InfoSheetContent
  /** aria-label personalizado; por defecto se infiere del título. */
  label?: string
}>()

const { showInfo } = useInfoSheet()

function open(e: Event) {
  // Evita que el click viaje al RatingBar (si el ícono está dentro).
  e.stopPropagation()
  e.preventDefault()
  showInfo(props.info)
}
</script>

<template>
  <button
    type="button"
    :aria-label="label || `Qué es: ${info.title}`"
    class="inline-flex items-center justify-center size-[20px] rounded-pill text-moss-ghost hover:text-moss hover:bg-surface-2 transition-colors duration-150 ease-sorbo"
    @click="open"
    @pointerdown.stop
  >
    <Icon name="lucide:info" class="size-[14px]" />
  </button>
</template>

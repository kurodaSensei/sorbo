<script setup lang="ts">
import { useLongPress } from '~/composables/useLongPress'

const props = withDefaults(
  defineProps<{
    /** Callback que dispara cuando se cumple el long-press. */
    onLongPress: () => void
    /** Duración del hold en ms. Default 500. */
    duration?: number
    /** Movimiento máximo permitido sin cancelar (px). Default 8. */
    moveThreshold?: number
  }>(),
  {
    duration: 500,
    moveThreshold: 8,
  },
)

const {
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  wasLongPress,
} = useLongPress(props.onLongPress, {
  duration: props.duration,
  moveThreshold: props.moveThreshold,
})

// Captura el click subsiguiente si vino de un long-press disparado, para
// que el NuxtLink/button dentro del slot no navegue cuando solo quisimos
// abrir el menú de acciones.
function onClickCapture(e: MouseEvent) {
  if (wasLongPress()) {
    e.preventDefault()
    e.stopPropagation()
  }
}
</script>

<template>
  <!-- contents preserva el layout del padre — esto no agrega un wrapper
       visible, solo escucha los eventos en su subárbol. -->
  <div
    class="contents"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @click.capture="onClickCapture"
  >
    <slot />
  </div>
</template>

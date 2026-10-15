import { onUnmounted, ref } from 'vue'

/**
 * Long-press handler reutilizable.
 *
 * Devuelve handlers de pointer + un ref `isPressing` para feedback visual
 * opcional. Dispara `onLongPress` después de `duration` ms de pointerdown
 * sin movimiento significativo (>moveThreshold px).
 *
 * Cancela en:
 *   - pointerup antes del threshold de tiempo
 *   - pointermove > moveThreshold px (era scroll, no press)
 *   - pointercancel (browser quitó el pointer al user, e.g. scroll empezó)
 *
 * Uso típico en una card:
 *   <div
 *     @pointerdown="onPointerDown"
 *     @pointerup="onPointerUp"
 *     @pointermove="onPointerMove"
 *     @pointercancel="onPointerCancel"
 *   >
 *     ...card content...
 *   </div>
 */
export function useLongPress(
  onLongPress: () => void,
  options: { duration?: number, moveThreshold?: number } = {},
) {
  const duration = options.duration ?? 500
  const moveThreshold = options.moveThreshold ?? 8

  const isPressing = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null
  let startX = 0
  let startY = 0
  let fired = false

  function clear() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    isPressing.value = false
  }

  function onPointerDown(e: PointerEvent) {
    // Solo botón principal del mouse o cualquier touch
    if (e.pointerType === 'mouse' && e.button !== 0) return
    startX = e.clientX
    startY = e.clientY
    isPressing.value = true
    fired = false
    timer = setTimeout(() => {
      fired = true
      isPressing.value = false
      onLongPress()
    }, duration)
  }

  function onPointerMove(e: PointerEvent) {
    if (!isPressing.value) return
    const dx = Math.abs(e.clientX - startX)
    const dy = Math.abs(e.clientY - startY)
    if (dx > moveThreshold || dy > moveThreshold) clear()
  }

  function onPointerUp(e: PointerEvent) {
    clear()
    // Si el long-press disparó, prevenimos el click subsiguiente para que
    // no abra el detalle / preview además del menú
    if (fired) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  function onPointerCancel() {
    clear()
  }

  // Si el componente se desmonta mientras hay un timer activo, limpiar
  onUnmounted(clear)

  return {
    isPressing,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    /** True si el último onPointerUp vino de un long-press disparado. */
    wasLongPress: () => fired,
  }
}

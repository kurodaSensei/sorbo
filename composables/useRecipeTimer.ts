import type { Ref } from 'vue'
import type { RecipeStep } from '~/types'

// Timer de una receta: avanza por sus pasos. Misma lógica que el de v1 (components/recipe/Detail.vue).
export function useRecipeTimer(steps: Ref<RecipeStep[]>) {
  const sorted = computed(() => [...steps.value].sort((a, b) => a.timeSeconds - b.timeSeconds))
  const totalSeconds = computed(() => sorted.value.at(-1)?.timeSeconds ?? 0)

  const running = ref(false)
  const elapsedMs = ref(0)
  let intervalId: ReturnType<typeof setInterval> | null = null
  let startedAt = 0

  function start() {
    if (running.value) return
    startedAt = Date.now() - elapsedMs.value
    running.value = true
    intervalId = setInterval(() => { elapsedMs.value = Date.now() - startedAt }, 100)
  }
  function pause() {
    running.value = false
    if (intervalId !== null) clearInterval(intervalId)
    intervalId = null
  }
  function reset() {
    pause()
    elapsedMs.value = 0
  }
  const toggle = () => (running.value ? pause() : start())
  onUnmounted(pause)

  const elapsedSeconds = computed(() => Math.floor(elapsedMs.value / 1000))
  const started = computed(() => running.value || elapsedMs.value > 0)
  const activeIndex = computed(() => {
    if (!started.value) return -1
    let idx = -1
    sorted.value.forEach((s, i) => { if (s.timeSeconds <= elapsedSeconds.value) idx = i })
    return idx
  })
  const finished = computed(() => totalSeconds.value > 0 && elapsedSeconds.value >= totalSeconds.value)
  // Al llegar al último paso se detiene (en v1 seguía contando).
  watch(finished, (done) => {
    if (!done) return
    pause()
    elapsedMs.value = totalSeconds.value * 1000
  })

  return { sorted, totalSeconds, running, started, elapsedSeconds, activeIndex, finished, start, pause, reset, toggle }
}

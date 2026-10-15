<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import type { Recipe } from '~/types'

const props = defineProps<{
  recipe: Recipe
}>()

const { getBrewMethodLabel } = useCatalog()

const methodLabel = computed(() => getBrewMethodLabel(props.recipe.brewMethod).toUpperCase())

const grindLabel: Record<string, string> = {
  fine: 'Fina',
  medium_fine: 'Media fina',
  medium: 'Media',
  medium_coarse: 'Media gruesa',
  coarse: 'Gruesa',
}

/** Coerce a possibly-legacy numeric grindSize (1-15 scale) into the enum label. */
function readableGrind(g: unknown): string | null {
  if (typeof g === 'string' && grindLabel[g]) return grindLabel[g]
  if (typeof g === 'number') {
    if (g <= 5) return 'Fina'
    if (g <= 10) return 'Media'
    return 'Gruesa'
  }
  return null
}

const grindText = computed(() => readableGrind(props.recipe.grindSize))

function cleanName(n: string): string {
  return (n || '').trim().replace(/\.+$/, '')
}

const sortedSteps = computed(() => [...(props.recipe.steps || [])].sort((a, b) => a.timeSeconds - b.timeSeconds))

const totalSeconds = computed(() => {
  if (sortedSteps.value.length === 0) return 0
  return sortedSteps.value[sortedSteps.value.length - 1].timeSeconds
})

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${ss.toString().padStart(2, '0')}`
}

const totalLabel = computed(() => formatTime(totalSeconds.value))

// ─────────────────────────────────────────────────────────────────────────────
// Timer
// ─────────────────────────────────────────────────────────────────────────────

const running = ref(false)
const elapsedMs = ref(0)
let intervalId: ReturnType<typeof setInterval> | null = null
let startedAt = 0

function tick() {
  elapsedMs.value = Date.now() - startedAt
}

function startTimer() {
  if (running.value) return
  startedAt = Date.now() - elapsedMs.value
  running.value = true
  intervalId = setInterval(tick, 100)
}

function pauseTimer() {
  running.value = false
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function resetTimer() {
  pauseTimer()
  elapsedMs.value = 0
}

function toggleTimer() {
  if (running.value) pauseTimer()
  else startTimer()
}

onUnmounted(() => {
  if (intervalId !== null) clearInterval(intervalId)
})

const elapsedSeconds = computed(() => Math.floor(elapsedMs.value / 1000))
const elapsedLabel = computed(() => formatTime(elapsedSeconds.value))

const activeStepIndex = computed(() => {
  if (!running.value && elapsedMs.value === 0) return -1
  let idx = -1
  sortedSteps.value.forEach((s, i) => {
    if (s.timeSeconds <= elapsedSeconds.value) idx = i
  })
  return idx
})

const isFinished = computed(
  () => totalSeconds.value > 0 && elapsedSeconds.value >= totalSeconds.value,
)
</script>

<template>
  <div class="flex flex-col gap-md">
    <header class="flex flex-col gap-xs">
      <UiEyebrow>{{ methodLabel }}</UiEyebrow>
      <h2 class="font-display tracking-[-0.02em] leading-[1.0] text-moss text-[36px] sm:text-[44px] break-words">
        <template v-if="recipe.author">
          {{ getBrewMethodLabel(recipe.brewMethod) }}<br>
          <span class="italic text-olive">{{ recipe.author }}</span>
        </template>
        <template v-else>
          {{ cleanName(recipe.name) }}
        </template>
      </h2>
    </header>

    <!-- Params card -->
    <div class="rounded-card-sm bg-surface-2 px-md py-sm">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-md gap-y-sm">
        <div class="flex flex-col gap-xxs">
          <UiEyebrow>Dosis</UiEyebrow>
          <span class="font-mono text-[14px] text-moss">{{ recipe.dose }}g</span>
        </div>
        <div class="flex flex-col gap-xxs">
          <UiEyebrow>Agua</UiEyebrow>
          <span class="font-mono text-[14px] text-moss">{{ recipe.water }}ml</span>
        </div>
        <div class="flex flex-col gap-xxs">
          <UiEyebrow>Ratio</UiEyebrow>
          <span class="font-mono text-[14px] text-moss">{{ recipe.ratio || `1:${Math.round(recipe.water / recipe.dose)}` }}</span>
        </div>
        <div class="flex flex-col gap-xxs">
          <UiEyebrow>Temp</UiEyebrow>
          <span class="font-mono text-[14px] text-moss">{{ recipe.waterTemp ? `${recipe.waterTemp}°C` : '—' }}</span>
        </div>
      </div>
      <div v-if="grindText" class="mt-sm pt-sm border-t border-moss/10 flex items-center justify-between gap-sm">
        <UiEyebrow>Molienda</UiEyebrow>
        <span class="font-sans text-[13px] text-moss">{{ grindText }}</span>
      </div>
    </div>

    <!-- Timeline -->
    <section v-if="sortedSteps.length > 0">
      <UiEyebrow>{{ running || elapsedMs > 0 ? elapsedLabel : `${totalLabel} de paciencia` }}</UiEyebrow>

      <ul class="mt-sm flex flex-col">
        <li
          v-for="(s, i) in sortedSteps"
          :key="i"
          class="flex items-start gap-md py-md border-b border-moss/10 transition-colors duration-200 ease-sorbo"
          :class="[
            activeStepIndex === i ? 'bg-surface-2/40 -mx-md px-md rounded-card-sm' : '',
          ]"
        >
          <span
            class="shrink-0 inline-flex items-center justify-center min-w-[56px] h-[26px] font-mono text-[13px] tabular-nums"
            :class="activeStepIndex === i ? 'text-olive' : 'text-moss'"
          >
            {{ formatTime(s.timeSeconds) }}
          </span>
          <div class="flex-1 min-w-0">
            <div
              class="font-sans text-[15px] font-medium"
              :class="activeStepIndex === i ? 'text-olive' : 'text-moss'"
            >
              {{ s.title }}
            </div>
            <div v-if="s.description" class="mt-xxs font-sans text-[13px] text-moss-soft">
              {{ s.description }}
            </div>
          </div>
        </li>
      </ul>

      <!-- Timer controls -->
      <div class="mt-lg flex items-center gap-xs">
        <UiButton
          :variant="running ? 'dark' : 'primary'"
          :block="true"
          @click="toggleTimer"
        >
          <template v-if="running">
            ⏸ Pausar · {{ elapsedLabel }}
          </template>
          <template v-else-if="elapsedMs > 0">
            ▶ Continuar · {{ elapsedLabel }}
          </template>
          <template v-else>
            ▶ Iniciar timer
          </template>
        </UiButton>
        <button
          v-if="elapsedMs > 0"
          type="button"
          class="inline-flex shrink-0 items-center justify-center size-[46px] rounded-pill bg-surface-2 text-moss hover:bg-surface transition-colors"
          aria-label="Reiniciar timer"
          @click="resetTimer"
        >
          <Icon name="lucide:rotate-ccw" class="size-4" />
        </button>
      </div>

      <p v-if="isFinished" class="mt-sm font-display italic text-[14px] text-olive text-center">
        ✓ Listo. Disfruta tu sorbo.
      </p>
    </section>

    <p v-else class="font-display italic text-[14px] text-moss-soft">
      Esta receta aún no tiene pasos en su cronología.
    </p>
  </div>
</template>

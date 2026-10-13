<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Recipe } from '~/types'
import { fmtSeconds } from '~/utils/dates'

// Temporizador v2 (design/v2/prototipo, Timer). Con ?receta=<id> sigue los
// pasos de la receta; sin ella es un cronómetro libre. Al terminar ofrece
// anotar la taza con los datos ya puestos.
definePageMeta({ hideTabBar: true })

const route = useRoute()
const router = useRouter()
const recipesStore = useRecipesStore()
const ui = useUiStore()
const { light } = useHaptic()

const recipeId = computed(() => typeof route.query.receta === 'string' ? route.query.receta : null)
const recipe = ref<Recipe | null>(null)

onMounted(async () => {
  if (!recipeId.value) return
  const all = [...recipesStore.list, ...recipesStore.sharedList] as Recipe[]
  recipe.value = all.find(r => r.id === recipeId.value) ?? null
  if (!recipe.value) {
    await recipesStore.loadById(recipeId.value).catch(() => {})
    recipe.value = recipesStore.current as Recipe | null
  }
})

const steps = computed(() => [...(recipe.value?.steps ?? [])].sort((a, b) => a.timeSeconds - b.timeSeconds))
const total = computed(() => steps.value.length ? steps.value[steps.value.length - 1].timeSeconds : 0)

const t = ref(0)
const running = ref(false)
let tick: ReturnType<typeof setInterval> | null = null
let startedAt = 0
let base = 0

function stop() {
  if (tick) clearInterval(tick)
  tick = null
  running.value = false
}

function start() {
  startedAt = Date.now()
  base = t.value
  running.value = true
  tick = setInterval(() => {
    // Se mide contra el reloj para no derivar si el navegador frena el intervalo.
    t.value = base + Math.floor((Date.now() - startedAt) / 1000)
    if (total.value && t.value >= total.value) {
      t.value = total.value
      stop()
      light()
    }
  }, 250)
}

function toggle() {
  light()
  if (running.value) stop()
  else start()
}

function reset() {
  stop()
  t.value = 0
}

onUnmounted(stop)

const done = computed(() => total.value ? t.value >= total.value : (!running.value && t.value > 0))
const current = computed(() => steps.value.reduce((acc, s, i) => t.value >= s.timeSeconds ? i : acc, 0))
const progress = computed(() => total.value ? Math.min(100, (t.value / total.value) * 100) : 0)
const ratio = computed(() => recipe.value && recipe.value.dose ? `1:${(recipe.value.water / recipe.value.dose).toFixed(1)}` : '')
const data = computed(() => {
  const r = recipe.value
  return r ? [`${r.dose} g`, `${r.water} ml`, r.waterTemp && `${r.waterTemp} °C`, ratio.value].filter(Boolean).join(' · ') : ''
})

function annotate() {
  const r = recipe.value
  ui.openNoteSheet(null, {
    method: r?.brewMethod,
    dose: r?.dose,
    water: r?.water,
    time: t.value || undefined,
    recipeName: r?.name,
  })
}

function back() {
  stop()
  if (window.history.length > 1) router.back()
  else router.replace('/app/recipes')
}
</script>

<template>
  <div class="tm">
    <header class="tm-head">
      <button type="button" class="tm-icon" aria-label="Volver" @click="back">
        <AppIcon name="right" :size="22" :stroke="2" style="transform: rotate(180deg)" />
      </button>
      <h1 class="tm-title">{{ recipe?.name ?? 'Temporizador libre' }}</h1>
      <NuxtLink v-if="recipe" :to="`/app/recipes/${recipe.id}`" class="tm-link">Receta</NuxtLink>
    </header>

    <div class="tm-body">
      <span v-if="data" class="tm-data">{{ data }}</span>

      <div class="tm-clock" role="timer" aria-live="off">
        <span class="tm-time">{{ fmtSeconds(t) || '0:00' }}</span>
        <span v-if="total" class="tm-cap">de {{ fmtSeconds(total) }}</span>
        <span v-if="total" class="tm-bar"><span :style="{ width: `${progress}%` }" /></span>
      </div>

      <div v-if="steps.length" class="tm-now" aria-live="polite">
        <span class="tm-label">{{ done ? 'Listo' : 'Ahora' }}</span>
        <span class="tm-now-t">{{ done ? 'Tu taza está lista' : steps[current].title }}</span>
        <span v-if="!done && steps[current].description" class="tm-desc">{{ steps[current].description }}</span>
      </div>

      <ol v-if="steps.length" class="tm-steps">
        <li v-for="(s, i) in steps" :key="i" :class="{ cur: i === current && !done, past: done || i < current }">
          <span class="tm-mono">{{ fmtSeconds(s.timeSeconds) || '0:00' }}</span>
          <span class="tm-grow">{{ s.title }}</span>
        </li>
      </ol>
    </div>

    <footer class="tm-foot">
      <button type="button" class="tm-btn tm-secondary tm-sq" aria-label="Reiniciar" @click="reset">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
      </button>
      <button v-if="done" type="button" class="tm-btn tm-primary" @click="annotate">Anotar esta taza</button>
      <button v-else type="button" class="tm-btn tm-primary" @click="toggle">
        {{ running ? 'Pausar' : t ? 'Seguir' : 'Empezar' }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
.tm { max-width: 640px; margin: 0 auto; min-height: 100svh; padding-bottom: calc(96px + env(safe-area-inset-bottom)); color: var(--ink); font-family: var(--font-sans); background: var(--bg); }
.tm-head { display: flex; align-items: center; gap: 4px; padding: 12px 8px 4px; }
.tm-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); flex-shrink: 0; }
.tm-title { flex: 1; margin: 0; font: 400 26px/30px var(--font-display); min-width: 0; }
.tm-link { min-height: var(--touch-min); padding: 0 8px; display: flex; align-items: center; font: 500 14px/1 var(--font-sans); color: var(--primary-pressed); }
.tm-body { padding: 8px 16px; display: flex; flex-direction: column; gap: 20px; }
.tm-data { text-align: center; font: 500 13px/18px var(--font-mono); color: var(--ink-soft); }
.tm-clock { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 0; }
.tm-time { font: 500 76px/1 var(--font-mono); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.tm-cap { font-size: 13px; color: var(--ink-soft); }
.tm-bar { width: 100%; height: 6px; margin-top: 16px; border-radius: 99px; background: var(--surface-strong); overflow: hidden; }
.tm-bar span { display: block; height: 100%; background: var(--primary); transition: width 250ms linear; }
.tm-now { padding: 16px; border-radius: var(--radius-lg); background: var(--surface); display: flex; flex-direction: column; gap: 4px; }
.tm-label { font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.tm-now-t { font: 400 24px/28px var(--font-display); }
.tm-desc { font-size: 14px; line-height: 20px; }
.tm-steps { list-style: none; margin: 0; padding: 0; }
.tm-steps li { display: flex; align-items: center; gap: 14px; min-height: 48px; border-top: 1px solid var(--line); color: var(--ink-soft); }
.tm-steps li.cur { color: var(--ink); font-weight: 600; }
.tm-steps li.past { opacity: 0.6; }
.tm-mono { font: 500 13px/18px var(--font-mono); min-width: 40px; }
.tm-grow { flex: 1; }
.tm-foot { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; gap: 10px; padding: 12px 16px calc(16px + env(safe-area-inset-bottom)); background: var(--bg); border-top: 1px solid var(--line); max-width: 640px; margin: 0 auto; }
.tm-btn { height: var(--button-height); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 8px; font: 600 16px/20px var(--font-sans); }
.tm-primary { flex: 1; background: var(--primary); color: var(--on-primary); }
.tm-secondary { background: var(--surface); color: var(--ink); }
.tm-sq { width: var(--button-height); flex-shrink: 0; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media (min-width: 1024px) { .tm-foot { left: 260px; } }
</style>

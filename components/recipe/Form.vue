<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { deleteField } from 'firebase/firestore'
import type { BrewMethod, GrindSize, Recipe, RecipeInput, RecipeStep } from '~/types'
import { GRIND_SIZE_OPTIONS } from '~/utils/constants'
import { formatStepTime, parseStepTime, ratioOf, recipeHint, sortSteps } from '~/utils/recipeForm'

// Receta v2: una pantalla para crear y editar (como CoffeeForm). Pasos
// editables en línea; autor e «ideal para» plegados en «Más».
const props = defineProps<{ recipe?: Recipe | null }>()

const router = useRouter()
const recipesStore = useRecipesStore()
const { brewMethodOptions } = useCatalog()
const { trackEvent } = useAnalytics()

const isNew = computed(() => !props.recipe)
const r = props.recipe

const num = (n?: number) => (n ? String(n) : '')
const f = reactive({
  name: r?.name ?? '',
  method: (r?.brewMethod ?? '') as BrewMethod | '',
  dose: num(r?.dose),
  water: num(r?.water),
  temp: num(r?.waterTemp),
  grind: (typeof r?.grindSize === 'string' ? r.grindSize : '') as GrindSize | '',
  instructions: r?.instructions ?? '',
  author: r?.author ?? '',
  bestFor: r?.bestFor ?? '',
})
const steps = ref<RecipeStep[]>(sortSteps(r?.steps ?? []))
const moreOpen = ref(!!(r?.author || r?.bestFor))

const dose = computed(() => Number(f.dose.replace(',', '.')) || null)
const water = computed(() => Number(f.water.replace(',', '.')) || null)
const ratio = computed(() => ratioOf(dose.value, water.value))
const hint = computed(() => recipeHint({ name: f.name, method: f.method, dose: dose.value, water: water.value }))

// ─── Pasos ──────────────────────────────────────────────────────────────────
const editing = ref<number | 'new' | null>(null)
const sf = reactive({ time: '', title: '', description: '' })

function openStep(i: number | 'new') {
  const s = i === 'new' ? null : steps.value[i]
  sf.time = s ? formatStepTime(s.timeSeconds) : ''
  sf.title = s?.title ?? ''
  sf.description = s?.description ?? ''
  editing.value = i
}

function commitStep() {
  const title = sf.title.trim()
  if (!title) return
  const step: RecipeStep = { timeSeconds: parseStepTime(sf.time), title, description: sf.description.trim() || undefined }
  const next = [...steps.value]
  if (editing.value === 'new') next.push(step)
  else if (editing.value !== null) next[editing.value] = step
  steps.value = sortSteps(next)
  editing.value = null
}

function removeStep() {
  if (typeof editing.value === 'number') steps.value = steps.value.filter((_, i) => i !== editing.value)
  editing.value = null
}

// ─── Guardar ────────────────────────────────────────────────────────────────
const saving = ref(false)
// Al editar, vaciar un campo lo borra del documento (undefined no se escribe).
const opt = <T,>(v: T | undefined | null | '') => (v === undefined || v === null || v === '') ? (isNew.value ? undefined : deleteField()) : v

async function save() {
  if (hint.value || saving.value) return
  saving.value = true
  const data = {
    name: f.name.trim(),
    brewMethod: f.method as BrewMethod,
    dose: dose.value!,
    water: water.value!,
    ratio: opt(ratio.value),
    grindSize: opt(f.grind),
    waterTemp: opt(Number(f.temp.replace(',', '.')) || undefined),
    instructions: opt(f.instructions.trim()),
    author: opt(f.author.trim()),
    bestFor: opt(f.bestFor.trim()),
    steps: opt(steps.value.length ? steps.value : undefined),
  }
  try {
    if (props.recipe) {
      await recipesStore.update(props.recipe.id, data as Partial<Recipe>)
      router.replace(`/app/recipes/${props.recipe.id}`)
    }
    else {
      const id = await recipesStore.create(data as RecipeInput)
      trackEvent('recipe_created', { has_steps: steps.value.length > 0, step_count: steps.value.length, brew_method: f.method })
      router.replace(`/app/recipes/${id}`)
    }
  }
  catch { /* el store ya mostró el aviso */ }
  finally {
    saving.value = false
  }
}

function back() {
  if (window.history.length > 1) router.back()
  else router.replace('/app/recipes')
}
</script>

<template>
  <div class="rf">
    <header class="rf-head">
      <button type="button" class="rf-icon" aria-label="Volver" @click="back">
        <AppIcon name="right" :size="22" :stroke="2" style="transform: rotate(180deg)" />
      </button>
      <h1 class="rf-title">{{ isNew ? 'Nueva receta' : 'Editar receta' }}</h1>
    </header>

    <div class="rf-body">
      <div class="rf-field">
        <label for="rf-name" class="rf-label">Nombre</label>
        <input id="rf-name" v-model="f.name" class="rf-input" placeholder="Mi V60 de la mañana" autocomplete="off">
      </div>

      <div class="rf-field">
        <span id="rf-method" class="rf-label">Método</span>
        <div class="rf-wrap" role="group" aria-labelledby="rf-method">
          <button
            v-for="m in brewMethodOptions"
            :key="m.value"
            type="button"
            class="rf-chip"
            :aria-pressed="f.method === m.value"
            @click="f.method = f.method === m.value ? '' : (m.value as BrewMethod)"
          >
            {{ m.label }}
          </button>
        </div>
      </div>

      <div class="rf-three">
        <div class="rf-field"><label for="rf-dose" class="rf-label">Dosis (g)</label><input id="rf-dose" v-model="f.dose" class="rf-input rf-mono" inputmode="decimal" placeholder="15"></div>
        <div class="rf-field"><label for="rf-water" class="rf-label">Agua (ml)</label><input id="rf-water" v-model="f.water" class="rf-input rf-mono" inputmode="decimal" placeholder="250"></div>
        <div class="rf-field"><label for="rf-temp" class="rf-label">Temp. (°C)</label><input id="rf-temp" v-model="f.temp" class="rf-input rf-mono" inputmode="decimal" placeholder="93"></div>
      </div>
      <p v-if="ratio" class="rf-ratio">Proporción <span class="rf-mono">{{ ratio }}</span></p>

      <div class="rf-field">
        <span id="rf-grind" class="rf-label">Molienda (opcional)</span>
        <div class="rf-wrap" role="group" aria-labelledby="rf-grind">
          <button
            v-for="g in GRIND_SIZE_OPTIONS"
            :key="g.value"
            type="button"
            class="rf-chip"
            :aria-pressed="f.grind === g.value"
            @click="f.grind = f.grind === g.value ? '' : g.value"
          >
            {{ g.label }}
          </button>
        </div>
      </div>

      <section class="rf-field">
        <h2 class="rf-label">Pasos</h2>
        <div v-if="steps.length" class="rf-list">
          <button v-for="(s, i) in steps" :key="i" type="button" class="rf-row" @click="openStep(i)">
            <span class="rf-time">{{ formatStepTime(s.timeSeconds) }}</span>
            <span class="rf-col"><span class="rf-strong">{{ s.title }}</span><span v-if="s.description" class="rf-cap">{{ s.description }}</span></span>
          </button>
        </div>

        <div v-if="editing !== null" class="rf-edit">
          <div class="rf-two">
            <div class="rf-field"><label for="rf-st" class="rf-label">Minuto</label><input id="rf-st" v-model="sf.time" class="rf-input rf-mono" inputmode="numeric" placeholder="0:45"></div>
            <div class="rf-field"><label for="rf-sn" class="rf-label">Paso</label><input id="rf-sn" v-model="sf.title" class="rf-input" placeholder="Vierte 50 ml"></div>
          </div>
          <div class="rf-field"><label for="rf-sd" class="rf-label">Detalle (opcional)</label><input id="rf-sd" v-model="sf.description" class="rf-input" autocomplete="off"></div>
          <div class="rf-actions">
            <button v-if="editing !== 'new'" type="button" class="rf-link rf-danger" @click="removeStep">Quitar paso</button>
            <span class="rf-grow" />
            <button type="button" class="rf-link" @click="editing = null">Cancelar</button>
            <button type="button" class="rf-small" :disabled="!sf.title.trim()" @click="commitStep">{{ editing === 'new' ? 'Añadir' : 'Listo' }}</button>
          </div>
        </div>
        <button v-else type="button" class="rf-add" @click="openStep('new')">+ Añadir paso</button>
      </section>

      <div class="rf-field">
        <label for="rf-notes" class="rf-label">Notas (opcional)</label>
        <textarea id="rf-notes" v-model="f.instructions" class="rf-input rf-area" rows="2" />
      </div>

      <section class="rf-fold">
        <button type="button" class="rf-fold-h" :aria-expanded="moreOpen" @click="moreOpen = !moreOpen">
          <span class="rf-strong">Más</span>
          <AppIcon name="down" :size="20" :stroke="2" :class="{ 'rf-rot': moreOpen }" />
        </button>
        <div v-if="moreOpen" class="rf-fold-b">
          <div class="rf-field"><label for="rf-author" class="rf-label">Autor o fuente (opcional)</label><input id="rf-author" v-model="f.author" class="rf-input" placeholder="James Hoffmann"></div>
          <div class="rf-field"><label for="rf-best" class="rf-label">Ideal para (opcional)</label><input id="rf-best" v-model="f.bestFor" class="rf-input" placeholder="Cafés claros y afrutados"></div>
        </div>
      </section>
    </div>

    <footer class="rf-foot">
      <button type="button" class="rf-save" :disabled="!!hint || saving" :aria-busy="saving || undefined" @click="save">
        {{ saving ? 'Guardando…' : 'Guardar receta' }}
      </button>
      <span v-if="hint && !saving" class="rf-cap rf-center">{{ hint }}</span>
    </footer>
  </div>
</template>

<style scoped>
.rf { max-width: 640px; margin: 0 auto; min-height: 100svh; padding-bottom: calc(110px + env(safe-area-inset-bottom)); color: var(--ink); font-family: var(--font-sans); background: var(--bg); }
.rf-head { display: flex; align-items: center; gap: 4px; padding: 12px 8px 4px; }
.rf-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.rf-title { margin: 0; font: 400 28px/30px var(--font-display); }
.rf-body { padding: 8px 16px; display: flex; flex-direction: column; gap: 16px; }
.rf-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.rf-label { margin: 0; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.rf-cap { margin: 0; font-size: 12px; line-height: 16px; color: var(--ink-soft); }
.rf-center { text-align: center; }
.rf-strong { font: 600 15px/22px var(--font-sans); }
.rf-col { display: flex; flex-direction: column; gap: 2px; min-width: 0; text-align: left; }
.rf-input { box-sizing: border-box; width: 100%; height: var(--field-height); border: 0; border-radius: var(--radius-sm); background: var(--surface); padding: 0 14px; font: 400 16px/22px var(--font-sans); color: var(--ink); }
.rf-input::placeholder { color: var(--ink-soft); }
.rf-input:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--primary); }
.rf-area { height: auto; min-height: 76px; padding: 13px 14px; resize: vertical; }
.rf-mono { font-family: var(--font-mono); font-size: 15px; }
.rf-ratio { margin: -8px 0 0; font-size: 13px; color: var(--ink-soft); }
.rf-two { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 8px; }
.rf-three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.rf-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.rf-chip { height: var(--chip-height); padding: 0 14px; border-radius: 99px; background: var(--surface); color: var(--ink); font: 400 14px/1 var(--font-sans); }
.rf-chip[aria-pressed='true'] { background: var(--primary); color: var(--on-primary); }
.rf-list { border-radius: var(--radius-md); background: var(--surface); overflow: hidden; }
.rf-row { width: 100%; min-height: 56px; display: flex; align-items: center; gap: 14px; padding: 8px 14px; }
.rf-row + .rf-row { border-top: 1px solid var(--line); }
.rf-time { flex: none; width: 44px; font: 500 14px/20px var(--font-mono); }
.rf-edit { display: flex; flex-direction: column; gap: 12px; padding: 12px; border-radius: var(--radius-md); background: var(--surface); }
.rf-edit .rf-input { background: var(--bg); }
.rf-actions { display: flex; align-items: center; gap: 8px; }
.rf-grow { flex: 1; }
.rf-link { min-height: var(--touch-min); padding: 0 8px; font: 500 14px/1 var(--font-sans); color: var(--primary-pressed); }
.rf-danger { color: var(--danger); padding-left: 0; }
.rf-small { min-height: var(--touch-min); padding: 0 18px; border-radius: var(--radius-md); background: var(--primary); color: var(--on-primary); font: 600 14px/1 var(--font-sans); }
.rf-small:disabled { background: var(--surface-strong); color: var(--ink-soft); }
.rf-add { align-self: flex-start; min-height: var(--touch-min); font: 500 14px/1 var(--font-sans); color: var(--primary-pressed); }
.rf-fold { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.rf-fold-h { width: 100%; min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.rf-fold-b { display: flex; flex-direction: column; gap: 12px; padding-bottom: 16px; }
.rf-rot { transform: rotate(180deg); }
.rf-foot { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; flex-direction: column; gap: 8px; padding: 12px 16px calc(16px + env(safe-area-inset-bottom)); background: var(--bg); border-top: 1px solid var(--line); max-width: 640px; margin: 0 auto; }
.rf-save { width: 100%; height: var(--button-height); border-radius: var(--radius-md); background: var(--primary); color: var(--on-primary); font: 600 16px/20px var(--font-sans); }
.rf-save:disabled { background: var(--surface-strong); color: var(--ink-soft); }
button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media (min-width: 1024px) { .rf-foot { left: 260px; } }
</style>

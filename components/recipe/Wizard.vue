<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { BrewMethod, GrindSize, Recipe, RecipeInput, RecipeStep } from '~/types'
import { BREW_METHOD_DESCRIPTION, GRIND_SIZE_OPTIONS } from '~/utils/constants'

const props = withDefaults(
  defineProps<{
    mode?: 'create' | 'edit'
    initialRecipe?: Recipe | null
    recipeId?: string
  }>(),
  {
    mode: 'create',
    initialRecipe: null,
  },
)

const router = useRouter()
const recipesStore = useRecipesStore()
const { brewMethodOptions, getBrewMethodLabel } = useCatalog()
const { trackEvent } = useAnalytics()
const { confirm } = useConfirm()

const methodDescription = computed(() =>
  brewMethod.value ? BREW_METHOD_DESCRIPTION[brewMethod.value] || '' : '',
)

// Molienda: describe visualmente + para qué método sirve.
const GRIND_DESCRIPTION: Record<string, string> = {
  fine: 'Azúcar de mesa — para espresso',
  medium_fine: 'Sal fina — para AeroPress, moka',
  medium: 'Sal gruesa — para V60, sifón',
  medium_coarse: 'Migas de pan — para Chemex, Kalita',
  coarse: 'Pimienta molida — para prensa francesa, cold brew',
}

const grindDescription = computed(() =>
  grindSize.value ? GRIND_DESCRIPTION[grindSize.value] || '' : '',
)

// ─────────────────────────────────────────────────────────────────────────────
// Wizard state
// ─────────────────────────────────────────────────────────────────────────────

const step = ref<1 | 2 | 3>(1)
const totalSteps = 3

// Step 1
const name = ref('')
const brewMethod = ref<BrewMethod | ''>('')
const author = ref('')

// Step 2
const dose = ref<number | null>(null)
const water = ref<number | null>(null)
const waterTemp = ref<number | null>(null)
const grindSize = ref<GrindSize | ''>('')

// Step 3
const steps = ref<RecipeStep[]>([])
const sheetOpen = ref(false)
const sheetEditingIndex = ref<number | null>(null)
const stepForm = ref({ time: '', title: '', description: '' })

const errors = ref<Record<string, string>>({})

// ─────────────────────────────────────────────────────────────────────────────
// Autosave sessionStorage (create mode). Mismo patrón de los otros wizards.
// ─────────────────────────────────────────────────────────────────────────────

const DRAFT_KEY = 'sorbo:recipe-wizard:draft'

function snapshot() {
  return {
    name: name.value,
    brewMethod: brewMethod.value,
    author: author.value,
    dose: dose.value,
    water: water.value,
    waterTemp: waterTemp.value,
    grindSize: grindSize.value,
    steps: steps.value.slice(),
    step: step.value,
    savedAt: Date.now(),
  }
}

const isDirty = computed(() =>
  !!(
    name.value.trim()
    || brewMethod.value
    || author.value.trim()
    || dose.value !== null
    || water.value !== null
    || waterTemp.value !== null
    || grindSize.value
    || steps.value.length
  ),
)

onMounted(() => {
  if (props.mode !== 'create' || props.initialRecipe) return
  if (typeof window === 'undefined') return
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const d = JSON.parse(raw)
    if (!d || Date.now() - d.savedAt > 24 * 60 * 60 * 1000) return
    name.value = d.name || ''
    brewMethod.value = (d.brewMethod as BrewMethod) || ''
    author.value = d.author || ''
    dose.value = d.dose ?? null
    water.value = d.water ?? null
    waterTemp.value = d.waterTemp ?? null
    grindSize.value = (d.grindSize as GrindSize) || ''
    steps.value = Array.isArray(d.steps) ? d.steps : []
    step.value = d.step || 1
  }
  catch { /* draft corrupto */ }
})

watch(
  [name, brewMethod, author, dose, water, waterTemp, grindSize, steps, step],
  () => {
    if (props.mode !== 'create') return
    if (typeof window === 'undefined') return
    if (!isDirty.value) {
      window.sessionStorage.removeItem(DRAFT_KEY)
      return
    }
    try { window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot())) }
    catch { /* quota */ }
  },
  { deep: true },
)

function clearDraft() {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.removeItem(DRAFT_KEY) }
  catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Prefill (edit mode)
// ─────────────────────────────────────────────────────────────────────────────

watch(
  () => props.initialRecipe,
  (r) => {
    if (!r) return
    name.value = r.name || ''
    brewMethod.value = r.brewMethod || ''
    author.value = r.author || ''
    dose.value = r.dose ?? null
    water.value = r.water ?? null
    waterTemp.value = r.waterTemp ?? null
    grindSize.value = r.grindSize || ''
    steps.value = (r.steps || []).map(s => ({ ...s }))
  },
  { immediate: true },
)

// ─────────────────────────────────────────────────────────────────────────────
// Derived
// ─────────────────────────────────────────────────────────────────────────────

const ratio = computed(() => {
  if (!dose.value || !water.value || dose.value <= 0) return null
  return `1:${Math.round(water.value / dose.value)}`
})

const activeMethods = computed(() => brewMethodOptions.value)

const GRIND_OPTIONS = GRIND_SIZE_OPTIONS

const sortedSteps = computed(() => [...steps.value].sort((a, b) => a.timeSeconds - b.timeSeconds))

// ─────────────────────────────────────────────────────────────────────────────
// Step navigation + validation
// ─────────────────────────────────────────────────────────────────────────────

function validateStep1(): boolean {
  errors.value = {}
  if (!name.value.trim()) errors.value.name = 'El nombre es obligatorio'
  if (!brewMethod.value) errors.value.method = 'Selecciona un método'
  return Object.keys(errors.value).length === 0
}

function validateStep2(): boolean {
  errors.value = {}
  if (!dose.value || dose.value <= 0) errors.value.dose = 'Dosis requerida'
  if (!water.value || water.value <= 0) errors.value.water = 'Agua requerida'
  return Object.keys(errors.value).length === 0
}

function next() {
  if (step.value === 1 && !validateStep1()) return
  if (step.value === 2 && !validateStep2()) return
  if (step.value < totalSteps) step.value = (step.value + 1) as 1 | 2 | 3
}

function back() {
  if (step.value > 1) {
    step.value = (step.value - 1) as 1 | 2 | 3
    return
  }
  router.back()
}

async function close() {
  if (props.mode === 'create' && isDirty.value) {
    const ok = await confirm({
      title: '¿Salir sin guardar?',
      message: 'Tu progreso quedará como borrador y podrás continuar la próxima vez que abras el wizard.',
      confirmLabel: 'Salir',
      cancelLabel: 'Seguir aquí',
    })
    if (!ok) return
  }
  if (props.mode === 'edit' && props.recipeId) router.push(`/app/recipes/${props.recipeId}`)
  else router.push('/app/recipes')
}

// ─────────────────────────────────────────────────────────────────────────────
// Step form (cronología)
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseTime(input: string): number {
  const trimmed = input.trim()
  if (!trimmed) return 0
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map(p => Number.parseInt(p, 10) || 0)
    return parts[0] * 60 + (parts[1] || 0)
  }
  return Number.parseInt(trimmed, 10) || 0
}

function openStepSheet(index: number | null = null) {
  sheetEditingIndex.value = index
  if (index !== null) {
    const s = steps.value[index]
    stepForm.value = {
      time: formatTime(s.timeSeconds),
      title: s.title,
      description: s.description || '',
    }
  }
  else {
    stepForm.value = { time: '', title: '', description: '' }
  }
  sheetOpen.value = true
}

function commitStep() {
  const title = stepForm.value.title.trim()
  if (!title) return
  const newStep: RecipeStep = {
    timeSeconds: parseTime(stepForm.value.time),
    title,
    description: stepForm.value.description.trim() || undefined,
  }
  if (sheetEditingIndex.value !== null) {
    steps.value[sheetEditingIndex.value] = newStep
  }
  else {
    steps.value.push(newStep)
  }
  sheetOpen.value = false
}

function removeStep(index: number) {
  steps.value.splice(index, 1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit
// ─────────────────────────────────────────────────────────────────────────────

const submitting = ref(false)
const { medium } = useHaptic()

async function submit() {
  if (submitting.value) return
  if (!validateStep2()) return
  medium()
  submitting.value = true
  try {
    const payload: RecipeInput = {
      name: name.value.trim(),
      brewMethod: brewMethod.value as BrewMethod,
      dose: dose.value as number,
      water: water.value as number,
      ratio: ratio.value || undefined,
      grindSize: (grindSize.value || undefined) as GrindSize | undefined,
      waterTemp: waterTemp.value ?? undefined,
      author: author.value.trim() || undefined,
      steps: sortedSteps.value.length > 0 ? sortedSteps.value : undefined,
    } as RecipeInput

    if (props.mode === 'edit' && props.recipeId) {
      await recipesStore.update(props.recipeId, payload as Partial<Recipe>)
      router.replace(`/app/recipes/${props.recipeId}`)
    }
    else {
      const id = await recipesStore.create(payload)
      clearDraft()
      trackEvent('recipe_created', {
        has_steps: sortedSteps.value.length > 0,
        step_count: sortedSteps.value.length,
        brew_method: brewMethod.value || 'unknown',
        has_author: !!author.value.trim(),
      })
      router.replace(`/app/recipes/${id}`)
    }
  }
  catch {
    // Toast surfaced by store
  }
  finally {
    submitting.value = false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

const stepTitles: Record<1 | 2 | 3, string> = {
  1: 'Identidad',
  2: 'Parámetros',
  3: 'Cronología',
}

const stepEyebrow = computed(
  () => `${step.value} / ${totalSteps} · ${stepTitles[step.value].toUpperCase()}`,
)

const submitLabel = computed(() =>
  props.mode === 'edit' ? '✓ Guardar cambios' : '✓ Crear receta',
)

const nextHint = computed(() => stepTitles[(step.value + 1) as 1 | 2 | 3] || '')

// ─────────────────────────────────────────────────────────────────────────────
// v3 (interruptor «recetas»): mismos datos y validación. En móvil sigue en
// 3 pasos; en escritorio es una sola página con los pasos en línea.
// ─────────────────────────────────────────────────────────────────────────────

const v3 = useFlag('recetas')
const isDesktop = useMediaQuery('(min-width: 1024px)')
const showStep = (n: 1 | 2 | 3) => isDesktop.value || step.value === n

const v3Steps = [
  { title: '¿Cómo se llama esta', word: 'receta', end: '?', sub: 'Nombre y método son obligatorios.' },
  { title: 'Los', word: 'números', end: '', sub: 'Dosis y agua son obligatorias. El ratio sale solo.' },
  { title: 'Los', word: 'pasos', end: '', sub: 'Tiempos y lo que haces en cada momento.' },
]
const currentStep = computed(() => v3Steps[step.value - 1])

// En escritorio todo se valida junto antes de guardar.
async function v3Save() {
  steps.value = steps.value.filter(st => st.title.trim())
  const e: Record<string, string> = {}
  if (!name.value.trim()) e.name = 'El nombre es obligatorio'
  if (!brewMethod.value) e.method = 'Elige un método'
  if (!dose.value || dose.value <= 0) e.dose = 'Escribe la dosis'
  if (!water.value || water.value <= 0) e.water = 'Escribe el agua'
  errors.value = e
  if (Object.keys(e).length) {
    if (e.name || e.method) step.value = 1
    else step.value = 2
    return
  }
  await submit()
}

function addInlineStep() {
  const last = steps.value.reduce((m, st) => Math.max(m, st.timeSeconds), -30)
  steps.value.push({ timeSeconds: last + 30, title: '' })
}
function onStepTime(i: number, value: string) {
  steps.value[i].timeSeconds = parseClock(value)
}
function onSheetKey(e: KeyboardEvent) {
  if (e.key === 'Escape') sheetOpen.value = false
}

const previewRecipe = computed(() => ({
  id: 'preview',
  name: name.value.trim() || 'Tu receta',
  brewMethod: brewMethod.value || undefined,
  author: author.value,
  dose: dose.value ?? 0,
  water: water.value ?? 0,
  ratio: ratio.value ?? undefined,
  waterTemp: waterTemp.value ?? undefined,
  steps: steps.value.filter(st => st.title.trim()),
}) as unknown as Recipe)

const numsError = computed(() => {
  const { dose: d, water: w } = errors.value
  if (d && w) return 'Faltan la dosis y el agua.'
  return d ? 'Falta la dosis.' : w ? 'Falta el agua.' : ''
})

const v3SubmitLabel = computed(() => (props.mode === 'edit' ? 'Guardar cambios' : 'Guardar receta'))
</script>

<template>
  <div v-if="v3" class="v3 wiz">
    <header class="wiz-head">
      <div class="wiz-bar mobile-only">
        <button type="button" class="icon-btn" :aria-label="step === 1 ? 'Cerrar' : 'Atrás'" @click="step === 1 ? close() : back()">
          <Icon :name="step === 1 ? 'lucide:x' : 'lucide:arrow-left'" size="22" />
        </button>
        <span class="v3-eyebrow wiz-eb">{{ mode === 'edit' ? 'Editar receta' : 'Nueva receta' }} · {{ step }} de {{ totalSteps }}</span>
        <span class="icon-btn" aria-hidden="true" />
      </div>
      <div role="progressbar" class="progress mobile-only" :aria-label="`Paso ${step} de ${totalSteps}`" aria-valuemin="1" :aria-valuemax="totalSteps" :aria-valuenow="step">
        <span v-for="n in totalSteps" :key="n" :class="['progress-seg', { 'progress-seg--on': n <= step }]" />
      </div>
      <div class="desktop-only desk-head">
        <button type="button" class="back" @click="close"><Icon name="lucide:arrow-left" size="20" />{{ mode === 'edit' ? 'Volver a la receta' : 'Tus recetas' }}</button>
        <h1 class="desk-title">{{ mode === 'edit' ? 'Editar' : 'Nueva' }} <span class="v3-accent-word">receta</span></h1>
        <p class="v3-subtitle desk-sub">Nombre, método, dosis y agua son obligatorios. Los pasos, opcionales.</p>
      </div>
    </header>

    <div class="wiz-layout">
      <form class="wiz-form" novalidate @submit.prevent>
        <div class="mobile-only step-title">
          <h1 class="q">{{ currentStep.title }} <span class="v3-accent-word">{{ currentStep.word }}</span>{{ currentStep.end }}</h1>
          <p class="v3-subtitle q-sub">{{ currentStep.sub }}</p>
        </div>

        <fieldset v-if="showStep(1)" class="section">
          <legend class="desktop-only legend"><span class="v3-eyebrow legend-n">01</span><span class="legend-q">¿Cómo se llama esta <span class="v3-accent-word">receta</span>?</span></legend>
          <div class="pair">
            <V3Field v-model="name" label="Nombre" placeholder="French Press Hoffmann" :error="errors.name" />
            <V3Field v-model="author" label="Autor o fuente · opcional" placeholder="James Hoffmann" />
          </div>
          <div class="field">
            <span id="v3-method-label" class="v3-label">Método</span>
            <div class="chips" role="group" aria-labelledby="v3-method-label">
              <button
                v-for="m in activeMethods"
                :key="m.value"
                type="button"
                :class="['v3-chip', { 'v3-chip--on': brewMethod === m.value }]"
                :aria-pressed="brewMethod === m.value"
                @click="brewMethod = brewMethod === m.value ? '' : (m.value as BrewMethod)"
              >
                {{ m.label }}
              </button>
            </div>
            <p v-if="errors.method" class="v3-meta v3-error">{{ errors.method }}</p>
            <p v-else-if="methodDescription" class="v3-meta">{{ methodDescription }}.</p>
          </div>
        </fieldset>

        <fieldset v-if="showStep(2)" class="section">
          <legend class="desktop-only legend"><span class="v3-eyebrow legend-n">02</span><span class="legend-q">Los <span class="v3-accent-word">números</span></span></legend>
          <div class="nums">
            <label :class="['num', { 'num--err': errors.dose }]">
              <span class="num-k">Dosis</span>
              <span class="num-v"><input v-model.number="dose" type="number" inputmode="decimal" min="0" step="0.5" placeholder="—" class="num-input"><span class="num-u">g</span></span>
            </label>
            <label :class="['num', { 'num--err': errors.water }]">
              <span class="num-k">Agua</span>
              <span class="num-v"><input v-model.number="water" type="number" inputmode="decimal" min="0" step="10" placeholder="—" class="num-input"><span class="num-u">ml</span></span>
            </label>
            <div class="num num--key" aria-live="polite">
              <span class="num-k">Ratio</span>
              <span class="num-v"><span class="num-big">{{ ratio || '—' }}</span></span>
              <span class="num-h">Se calcula solo</span>
            </div>
            <label class="num">
              <span class="num-k">Temperatura</span>
              <span class="num-v"><input v-model.number="waterTemp" type="number" inputmode="numeric" min="0" max="100" placeholder="—" class="num-input"><span class="num-u">°C</span></span>
            </label>
          </div>
          <p v-if="numsError" class="v3-meta v3-error">{{ numsError }}</p>
          <div class="field">
            <span id="v3-grind-label" class="v3-label">Molienda <span class="opt">· opcional</span></span>
            <div class="chips" role="group" aria-labelledby="v3-grind-label">
              <button
                v-for="g in GRIND_OPTIONS"
                :key="g.value"
                type="button"
                :class="['v3-chip', { 'v3-chip--on': grindSize === g.value }]"
                :aria-pressed="grindSize === g.value"
                @click="grindSize = grindSize === g.value ? '' : (g.value as GrindSize)"
              >
                {{ g.label }}
              </button>
            </div>
            <p v-if="grindDescription" class="v3-meta">{{ grindDescription }}.</p>
          </div>
        </fieldset>

        <fieldset v-if="showStep(3)" class="section section--last">
          <legend class="desktop-only legend"><span class="v3-eyebrow legend-n">03</span><span class="legend-q">Los <span class="v3-accent-word">pasos</span> <span class="v3-meta">· opcionales</span></span></legend>

          <template v-if="isDesktop">
            <div v-for="(st, i) in steps" :key="i" class="inline-step">
              <input :value="formatClock(st.timeSeconds)" class="v3-input mono" :aria-label="`Tiempo del paso ${i + 1}`" placeholder="0:00" @change="onStepTime(i, ($event.target as HTMLInputElement).value)">
              <input v-model="st.title" class="v3-input sans" :aria-label="`Qué haces en el paso ${i + 1}`" placeholder="Vierte el agua">
              <input v-model="st.description" class="v3-input sans" :aria-label="`Detalle del paso ${i + 1}`" placeholder="Detalle (opcional)">
              <button type="button" class="icon-btn" :aria-label="`Quitar paso ${i + 1}`" @click="removeStep(i)"><Icon name="lucide:x" size="18" /></button>
            </div>
            <button type="button" class="v3-chip v3-chip--add add-step" @click="addInlineStep">+ Agregar paso</button>
          </template>

          <template v-else>
            <ol v-if="sortedSteps.length" class="step-list">
              <li v-for="(st, i) in sortedSteps" :key="i" class="step-row">
                <span class="step-time">{{ formatClock(st.timeSeconds) }}</span>
                <span class="step-text"><span class="step-title">{{ st.title }}</span><span v-if="st.description" class="v3-meta">{{ st.description }}</span></span>
                <button type="button" class="icon-btn small" :aria-label="`Editar «${st.title}»`" @click="openStepSheet(steps.indexOf(st))"><Icon name="lucide:pencil" size="18" /></button>
                <button type="button" class="icon-btn small" :aria-label="`Quitar «${st.title}»`" @click="removeStep(steps.indexOf(st))"><Icon name="lucide:trash-2" size="18" /></button>
              </li>
            </ol>
            <button type="button" class="v3-btn add-btn" @click="openStepSheet(null)">+ Agregar paso</button>
            <p class="v3-meta">Los pasos son opcionales. Con ellos, el detalle te guía con el timer.</p>
          </template>
        </fieldset>
      </form>

      <aside class="desktop-only preview" aria-label="Vista previa">
        <span class="v3-eyebrow preview-eb">— Así se verá</span>
        <V3RecipeCard :recipe="previewRecipe" preview />
        <button type="button" class="v3-btn v3-btn--primary" :disabled="submitting" :aria-busy="submitting || undefined" @click="v3Save">
          <span v-if="submitting" class="v3-spinner" aria-hidden="true" />{{ v3SubmitLabel }}
        </button>
        <button type="button" class="v3-btn cancel" @click="close">Cancelar</button>
        <p v-if="mode === 'create'" class="v3-meta">Guardamos un borrador mientras escribes.</p>
      </aside>
    </div>

    <div class="wiz-foot mobile-only">
      <button v-if="step < totalSteps" type="button" class="v3-btn v3-btn--primary grow" @click="next">Siguiente</button>
      <button v-else type="button" class="v3-btn v3-btn--primary grow" :disabled="submitting" :aria-busy="submitting || undefined" @click="v3Save">
        <span v-if="submitting" class="v3-spinner" aria-hidden="true" />{{ v3SubmitLabel }}
      </button>
    </div>

    <Teleport to="body">
      <div v-if="sheetOpen && !isDesktop" class="v3 v3-sheet-wrap" @keydown="onSheetKey">
        <div class="v3-sheet-veil" aria-hidden="true" @click="sheetOpen = false" />
        <section role="dialog" aria-modal="true" aria-labelledby="step-sheet-title" class="v3-sheet step-sheet">
          <span class="v3-sheet-handle" aria-hidden="true" />
          <div class="v3-sheet-head">
            <h2 id="step-sheet-title" class="v3-sheet-title">{{ sheetEditingIndex !== null ? 'Editar paso' : 'Nuevo paso' }}</h2>
            <button type="button" class="v3-sheet-close" aria-label="Cerrar" @click="sheetOpen = false"><Icon name="lucide:x" size="20" /></button>
          </div>
          <div class="sheet-body">
            <div class="sheet-pair">
              <V3Field v-model="stepForm.time" label="Tiempo" inputmode="numeric" placeholder="4:00" />
              <V3Field v-model="stepForm.title" label="Qué haces" placeholder="Vierte el agua" />
            </div>
            <V3Field v-model="stepForm.description" label="Detalle · opcional" placeholder="Saturación rápida del café molido grueso." />
            <button type="button" class="v3-btn v3-btn--primary" :disabled="!stepForm.title.trim()" @click="commitStep">
              {{ sheetEditingIndex !== null ? 'Guardar cambios' : 'Agregar paso' }}
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </div>

  <div v-else class="min-h-svh bg-paper text-moss font-sans antialiased flex flex-col">
    <header class="px-md pt-[calc(env(safe-area-inset-top)+16px)] lg:px-xl">
      <div class="mx-auto w-full max-w-[640px] flex items-center justify-between gap-md">
        <button
          v-if="step === 1"
          type="button"
          class="inline-flex items-center justify-center size-[40px] rounded-pill text-moss hover:bg-surface-2/60 transition-colors"
          aria-label="Cerrar"
          @click="close"
        >
          <Icon name="lucide:x" class="size-5" />
        </button>
        <button
          v-else
          type="button"
          class="inline-flex items-center justify-center size-[40px] rounded-pill text-moss hover:bg-surface-2/60 transition-colors"
          aria-label="Atrás"
          @click="back"
        >
          <Icon name="lucide:arrow-left" class="size-5" />
        </button>

        <UiEyebrow class="text-center flex-1">
          {{ stepEyebrow }}
        </UiEyebrow>

        <div class="size-[40px]" aria-hidden="true" />
      </div>

      <div class="mx-auto w-full max-w-[640px] mt-md">
        <UiProgressBar :current="step" :total="totalSteps" />
      </div>
    </header>

    <main class="flex-1 mx-auto w-full max-w-[640px] px-md pt-xl pb-[120px] lg:px-xl">
      <!-- ━━━━━━━━━━━━ STEP 1 — IDENTIDAD ━━━━━━━━━━━━ -->
      <section v-if="step === 1">
        <h1 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[34px] sm:text-[40px]">
          ¿Cómo se llama<br>esta <span class="italic text-olive">receta</span>?
        </h1>
        <p class="subtitle-italic mt-sm">
          Nombre y método para empezar.
        </p>

        <div class="mt-xl flex flex-col gap-xs">
          <UiInput
            v-model="name"
            label="Nombre"
            placeholder="French Press Hoffmann"
            :error="errors.name"
          />

          <!-- Method display + chips -->
          <div class="pt-[14px] pb-[13px] border-b border-moss/10">
            <label class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft">
              <span aria-hidden="true">— </span>Método
            </label>
            <div
              class="mt-xs font-display text-[18px] leading-none"
              :class="brewMethod ? 'text-moss' : 'italic text-moss-ghost'"
            >
              {{ brewMethod ? getBrewMethodLabel(brewMethod) : 'Selecciona…' }}
            </div>
          </div>
          <div class="mt-xs flex flex-wrap gap-xxs">
            <UiChip
              v-for="m in activeMethods"
              :key="m.value"
              interactive
              :variant="brewMethod === m.value ? 'active' : 'default'"
              @click="brewMethod = brewMethod === m.value ? '' : (m.value as BrewMethod)"
            >
              {{ m.label }}
            </UiChip>
          </div>
          <p
            v-if="methodDescription"
            class="mt-xs font-display italic text-[13px] text-moss-soft leading-snug"
          >
            {{ methodDescription }}
          </p>
          <p
            v-if="errors.method"
            class="mt-xxs font-mono text-[10px] font-medium uppercase tracking-eyebrow text-terracotta"
          >
            <span aria-hidden="true">— </span>{{ errors.method }}
          </p>

          <UiInput
            v-model="author"
            label="Autor / Fuente"
            class="mt-md"
            placeholder="James Hoffmann"
          />
        </div>
      </section>

      <!-- ━━━━━━━━━━━━ STEP 2 — PARÁMETROS ━━━━━━━━━━━━ -->
      <section v-if="step === 2">
        <h1 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[34px] sm:text-[40px]">
          Los <span class="italic text-olive">números</span>
        </h1>
        <p class="subtitle-italic mt-sm">
          Dosis, agua, temperatura — lo medible.
        </p>

        <div class="mt-xl grid grid-cols-2 gap-sm">
          <!-- DOSIS -->
          <label class="rounded-card-sm bg-surface-2 p-md flex flex-col gap-xs cursor-text">
            <UiEyebrow>Dosis</UiEyebrow>
            <div class="flex items-baseline gap-xs">
              <input
                v-model.number="dose"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.5"
                placeholder="—"
                class="w-[80px] bg-transparent border-0 outline-none font-display text-[32px] leading-none text-moss placeholder:text-moss-ghost"
              >
              <span class="font-mono text-[12px] text-moss-soft">g</span>
            </div>
          </label>

          <!-- AGUA -->
          <label class="rounded-card-sm bg-surface-2 p-md flex flex-col gap-xs cursor-text">
            <UiEyebrow>Agua</UiEyebrow>
            <div class="flex items-baseline gap-xs">
              <input
                v-model.number="water"
                type="number"
                inputmode="decimal"
                min="0"
                step="10"
                placeholder="—"
                class="w-[100px] bg-transparent border-0 outline-none font-display text-[32px] leading-none text-moss placeholder:text-moss-ghost"
              >
              <span class="font-mono text-[12px] text-moss-soft">ml</span>
            </div>
          </label>

          <!-- RATIO (auto) -->
          <div class="rounded-card-sm bg-olive p-md flex flex-col gap-xs">
            <UiEyebrow class="text-paper">Ratio</UiEyebrow>
            <span class="font-display text-[32px] leading-none text-paper">
              {{ ratio || '—' }}
            </span>
          </div>

          <!-- TEMP -->
          <label class="rounded-card-sm bg-surface-2 p-md flex flex-col gap-xs cursor-text">
            <UiEyebrow>Temp</UiEyebrow>
            <div class="flex items-baseline gap-xs">
              <input
                v-model.number="waterTemp"
                type="number"
                inputmode="numeric"
                min="0"
                max="100"
                placeholder="—"
                class="w-[60px] bg-transparent border-0 outline-none font-display text-[32px] leading-none text-moss placeholder:text-moss-ghost"
              >
              <span class="font-mono text-[12px] text-moss-soft">°C</span>
            </div>
          </label>
        </div>

        <p
          v-if="errors.dose || errors.water"
          class="mt-sm font-mono text-[10px] font-medium uppercase tracking-eyebrow text-terracotta"
        >
          <span aria-hidden="true">— </span>{{ errors.dose || errors.water }}
        </p>

        <!-- MOLIENDA -->
        <div class="mt-xl">
          <UiEyebrow>Molienda</UiEyebrow>
          <div class="mt-sm flex flex-wrap gap-xxs">
            <UiChip
              v-for="g in GRIND_OPTIONS"
              :key="g.value"
              interactive
              :variant="grindSize === g.value ? 'active' : 'default'"
              @click="grindSize = grindSize === g.value ? '' : (g.value as GrindSize)"
            >
              {{ g.label }}
            </UiChip>
          </div>
          <!-- Descripción visual + método sugerido. Jordan sin barista
               background no visualiza 'sal fina' vs 'migas de pan'. -->
          <p
            v-if="grindDescription"
            class="mt-xs font-display italic text-[13px] text-moss-soft leading-snug"
          >
            {{ grindDescription }}
          </p>
        </div>
      </section>

      <!-- ━━━━━━━━━━━━ STEP 3 — CRONOLOGÍA ━━━━━━━━━━━━ -->
      <section v-if="step === 3">
        <h1 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[34px] sm:text-[40px]">
          Los <span class="italic text-olive">pasos</span>
        </h1>
        <p class="subtitle-italic mt-sm">
          Tiempos y lo que haces en cada hito.
        </p>

        <ul class="mt-lg flex flex-col">
          <li
            v-for="(s, i) in sortedSteps"
            :key="i"
            class="flex items-start gap-md py-md border-b border-moss/10"
          >
            <span class="shrink-0 inline-flex items-center justify-center min-w-[56px] h-[28px] rounded-card-sm bg-surface-2 px-sm font-mono text-[12px] text-moss tabular-nums">
              {{ formatTime(s.timeSeconds) }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="font-sans text-[15px] font-medium text-moss">{{ s.title }}</div>
              <div v-if="s.description" class="mt-xxs font-sans text-[13px] text-moss-soft">
                {{ s.description }}
              </div>
            </div>
            <UiActionMenu align="right" aria-label="Más">
              <UiActionMenuItem icon="lucide:pencil" @click="openStepSheet(steps.indexOf(s))">
                Editar
              </UiActionMenuItem>
              <UiActionMenuItem destructive icon="lucide:trash-2" @click="removeStep(steps.indexOf(s))">
                Quitar
              </UiActionMenuItem>
            </UiActionMenu>
          </li>
        </ul>

        <button
          type="button"
          class="mt-md w-full py-sm font-mono text-[10px] font-medium uppercase tracking-eyebrow text-olive hover:opacity-80 transition-opacity"
          @click="openStepSheet(null)"
        >
          + Agregar paso
        </button>
      </section>
    </main>

    <!-- Sticky bottom CTA -->
    <div class="fixed inset-x-0 bottom-0 z-20 px-md pb-[calc(env(safe-area-inset-bottom)+12px)] pt-sm bg-paper/95 backdrop-blur-md border-t border-moss/5 lg:px-xl">
      <div class="mx-auto w-full max-w-[640px]">
        <UiButton
          v-if="step < totalSteps"
          variant="primary"
          @click="next"
        >
          Siguiente →
          <span class="font-mono text-[10px] uppercase tracking-eyebrow opacity-70 ml-xs">
            {{ nextHint }}
          </span>
        </UiButton>
        <UiButton
          v-else
          variant="dark"
          :loading="submitting"
          @click="submit"
        >
          {{ submitLabel }}
        </UiButton>
      </div>
    </div>

    <!-- Step form bottom sheet -->
    <UiBottomSheet v-model="sheetOpen" :title="sheetEditingIndex !== null ? 'Editar paso' : 'Nuevo paso'">
      <div class="flex flex-col gap-xs pt-xs">
        <UiInput v-model="stepForm.time" label="Tiempo" placeholder="4:00" />
        <UiInput v-model="stepForm.title" label="Título" placeholder="Vierte el agua" />
        <UiInput v-model="stepForm.description" label="Descripción" placeholder="Saturación rápida del café molido grueso." />
      </div>
      <UiButton variant="primary" class="mt-xl" :disabled="!stepForm.title.trim()" @click="commitStep">
        {{ sheetEditingIndex !== null ? 'Guardar cambios' : 'Agregar paso' }}
      </UiButton>
    </UiBottomSheet>
  </div>
</template>

<style scoped>
.wiz { min-height: 100svh; box-sizing: border-box; display: flex; flex-direction: column; padding: calc(env(safe-area-inset-top) + 8px) 0 120px; }
.desktop-only { display: none !important; }
.wiz-head { display: flex; flex-direction: column; gap: 8px; padding: 0 8px; }
.wiz-bar { display: flex; align-items: center; justify-content: space-between; }
.icon-btn { flex: none; width: 44px; height: 44px; border: 0; border-radius: 12px; background: transparent; color: var(--ink-soft); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.icon-btn.small { width: 40px; height: 40px; }
.wiz-bar .icon-btn { color: var(--ink); }
.wiz-eb { color: var(--ink-soft); }
.progress { display: flex; gap: 6px; padding: 0 12px; }
.progress-seg { flex: 1; height: 4px; border-radius: 9999px; background: var(--track); }
.progress-seg--on { background: var(--primary); }
.wiz-layout { display: flex; flex-direction: column; }
.wiz-form { display: flex; flex-direction: column; gap: 24px; padding: 28px 20px 0; }
.step-title { display: flex; flex-direction: column; gap: 8px; }
.q { margin: 0; font: 400 36px/36px var(--font-display); letter-spacing: -0.015em; }
.q-sub { margin: 0; font-size: 16px; }
.section { margin: 0; padding: 0; border: 0; min-width: 0; display: flex; flex-direction: column; gap: 18px; }
.field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.field p { margin: 0; }
.opt { font-weight: 400; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.pair { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
.nums { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.num { display: flex; flex-direction: column; gap: 6px; padding: 14px; border-radius: 16px; background: var(--surface); color: var(--ink); cursor: text; min-width: 0; }
.num--err { box-shadow: inset 0 0 0 2px var(--danger); }
.num--key { background: var(--primary); color: var(--on-primary); cursor: default; }
.num-k { font: 600 13px/16px var(--font-sans); opacity: 0.85; }
.num-v { display: flex; align-items: baseline; gap: 4px; }
.num-input { width: 4.2ch; min-width: 0; flex: 0 1 auto; border: 0; padding: 0; background: transparent; font: 400 34px/1 var(--font-display); color: inherit; outline: none; }
.num-input::placeholder { color: var(--ink-faint); }
.num:focus-within { box-shadow: inset 0 0 0 2px var(--primary); }
.num-big { font: 400 34px/1 var(--font-display); }
.num-u { font: 400 14px/18px var(--font-sans); opacity: 0.8; }
.num-h { font: 400 12px/16px var(--font-sans); opacity: 0.8; }
.step-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.step-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 4px 10px 14px; border-radius: 14px; background: var(--surface); }
.step-time { flex: none; min-width: 44px; margin-top: 2px; padding: 2px 8px; border-radius: 8px; background: var(--bg); font: 500 13px/18px var(--font-mono); text-align: center; }
.step-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; padding-top: 2px; }
.step-title { font: 500 15px/22px var(--font-sans); }
.add-btn { background: transparent; box-shadow: inset 0 0 0 1px var(--line-strong); color: var(--primary); }
.add-btn:hover { background: var(--surface); }
.wiz-foot { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; gap: 10px; padding: 12px 20px calc(env(safe-area-inset-bottom) + 16px); background: color-mix(in srgb, var(--bg) 95%, transparent); border-top: 1px solid var(--line); }
.grow { flex: 1; }
.cancel { background: transparent; color: var(--ink); }
.cancel:hover { background: var(--surface); }
.step-sheet .sheet-body { display: flex; flex-direction: column; gap: 16px; padding: 4px 20px calc(24px + env(safe-area-inset-bottom)); }
.sheet-pair { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 10px; }

@media (min-width: 1024px) {
  .wiz { padding: 24px 48px 64px; max-width: 1180px; margin: 0 auto; width: 100%; }
  .mobile-only { display: none !important; }
  .desktop-only { display: flex !important; }
  .wiz-head { padding: 0; }
  .desk-head { flex-direction: column; gap: 10px; }
  .back { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-left: -12px; padding: 0 12px; border: 0; background: transparent; color: var(--ink); font: 600 15px/20px var(--font-sans); cursor: pointer; }
  .desk-title { margin: 0; font: 400 56px/52px var(--font-display); letter-spacing: -0.02em; }
  .desk-sub { margin: 0; font-size: 19px; line-height: 26px; }
  .wiz-layout { flex-direction: row; align-items: flex-start; gap: 40px; margin-top: 24px; }
  .wiz-form { flex: 3 1 480px; padding: 0; gap: 32px; }
  .section { padding-bottom: 32px; border-bottom: 1px solid var(--line); }
  .section--last { padding-bottom: 0; border-bottom: 0; gap: 10px; }
  .legend { align-items: baseline; gap: 12px; padding: 0 0 16px; }
  .legend-n { color: var(--ink-soft); }
  .legend-q { font: 400 28px/32px var(--font-display); }
  .pair { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .nums { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .inline-step { display: grid; grid-template-columns: 88px minmax(0, 1fr) minmax(0, 1.3fr) 44px; gap: 8px; align-items: center; }
  .mono { font: 500 15px/20px var(--font-mono); text-align: center; padding: 12px 8px; }
  .sans { font: 400 16px/22px var(--font-sans); }
  .add-step { align-self: flex-start; margin-top: 6px; }
  .preview { flex: 2 1 300px; min-width: 0; position: sticky; top: 24px; flex-direction: column; gap: 14px; }
  .preview-eb { color: var(--ink-soft); }
}
</style>

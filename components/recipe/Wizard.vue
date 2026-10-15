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
</script>

<template>
  <div class="min-h-svh bg-paper text-moss font-sans antialiased flex flex-col">
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

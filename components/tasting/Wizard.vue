<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { BrewMethod, Coffee, Tasting, TastingInput } from '~/types'
import { BREW_METHOD_DESCRIPTION, TASTING_ATTRIBUTE_INFO } from '~/utils/constants'

const props = withDefaults(
  defineProps<{
    mode?: 'create' | 'edit'
    initialTasting?: Tasting | null
    tastingId?: string
    /** Pre-select a coffee in step 1 (create mode). */
    initialCoffeeId?: string | null
  }>(),
  {
    mode: 'create',
    initialTasting: null,
    initialCoffeeId: null,
  },
)

const router = useRouter()
const tastingsStore = useTastingsStore()
const coffeesStore = useCoffeesStore()
const { brewMethodOptions, getBrewMethodLabel } = useCatalog()
const { trackEvent } = useAnalytics()
const { confirm } = useConfirm()

const methodDescription = computed(() =>
  brewMethod.value ? BREW_METHOD_DESCRIPTION[brewMethod.value] || '' : '',
)

onMounted(() => {
  if (!coffeesStore.list.length) coffeesStore.loadAll().catch(() => {})
})

// ─────────────────────────────────────────────────────────────────────────────
// Wizard state
// ─────────────────────────────────────────────────────────────────────────────

const step = ref<1 | 2 | 3>(1)
const totalSteps = 3

// Step 1
const coffeeId = ref<string>('')
const brewMethod = ref<BrewMethod | ''>('')

// Step 2
const ratingOverall = ref<number | null>(null)
const ratingAroma = ref<number | null>(null)
const ratingAcidity = ref<number | null>(null)
const ratingSweetness = ref<number | null>(null)
const ratingBody = ref<number | null>(null)
const ratingAftertaste = ref<number | null>(null)

// Step 3
const personalNotes = ref('')
const isFavorite = ref(false)
const wouldBuyAgain = ref(false)

const errors = ref<Record<string, string>>({})

// ─────────────────────────────────────────────────────────────────────────────
// Autosave a sessionStorage — Casey pierde el hilo en una interrupción y no
// queremos que también pierda la cata. Solo en mode='create'; edit tiene la
// versión servidor como fuente de verdad.
// ponytail: sessionStorage, no localStorage; el draft muere al cerrar la pestaña
// (comportamiento esperado en un wizard efímero).
// ─────────────────────────────────────────────────────────────────────────────

const DRAFT_KEY = 'sorbo:tasting-wizard:draft'

interface Draft {
  coffeeId: string
  brewMethod: string
  ratingOverall: number | null
  ratingAroma: number | null
  ratingAcidity: number | null
  ratingSweetness: number | null
  ratingBody: number | null
  ratingAftertaste: number | null
  personalNotes: string
  isFavorite: boolean
  wouldBuyAgain: boolean
  step: 1 | 2 | 3
  savedAt: number
}

function snapshot(): Draft {
  return {
    coffeeId: coffeeId.value,
    brewMethod: brewMethod.value || '',
    ratingOverall: ratingOverall.value,
    ratingAroma: ratingAroma.value,
    ratingAcidity: ratingAcidity.value,
    ratingSweetness: ratingSweetness.value,
    ratingBody: ratingBody.value,
    ratingAftertaste: ratingAftertaste.value,
    personalNotes: personalNotes.value,
    isFavorite: isFavorite.value,
    wouldBuyAgain: wouldBuyAgain.value,
    step: step.value,
    savedAt: Date.now(),
  }
}

const isDirty = computed(() => {
  return !!(
    coffeeId.value
    || brewMethod.value
    || ratingOverall.value !== null
    || ratingAroma.value !== null
    || ratingAcidity.value !== null
    || ratingSweetness.value !== null
    || ratingBody.value !== null
    || ratingAftertaste.value !== null
    || personalNotes.value.trim()
    || isFavorite.value
    || wouldBuyAgain.value
  )
})

// Restore draft on mount (create mode only, sin initialTasting).
onMounted(() => {
  if (props.mode !== 'create' || props.initialTasting) return
  if (typeof window === 'undefined') return
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const d = JSON.parse(raw) as Draft
    // No restaurar drafts de días atrás (sessionStorage muere con la pestaña,
    // pero por si acaso).
    if (Date.now() - d.savedAt > 24 * 60 * 60 * 1000) return
    coffeeId.value = d.coffeeId
    brewMethod.value = (d.brewMethod as BrewMethod) || ''
    ratingOverall.value = d.ratingOverall
    ratingAroma.value = d.ratingAroma
    ratingAcidity.value = d.ratingAcidity
    ratingSweetness.value = d.ratingSweetness
    ratingBody.value = d.ratingBody
    ratingAftertaste.value = d.ratingAftertaste
    personalNotes.value = d.personalNotes
    isFavorite.value = d.isFavorite
    wouldBuyAgain.value = d.wouldBuyAgain
    step.value = d.step
  }
  catch { /* draft corrupto, ignora */ }
})

// Autosave con watch profundo sobre todo el snapshot. No debounce (state
// cambia lento en un wizard humano; el costo de escribir es despreciable).
watch(
  [coffeeId, brewMethod, ratingOverall, ratingAroma, ratingAcidity,
    ratingSweetness, ratingBody, ratingAftertaste, personalNotes,
    isFavorite, wouldBuyAgain, step],
  () => {
    if (props.mode !== 'create') return
    if (typeof window === 'undefined') return
    if (!isDirty.value) {
      window.sessionStorage.removeItem(DRAFT_KEY)
      return
    }
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot()))
    }
    catch { /* quota o disabled, no bloqueamos */ }
  },
  { deep: false },
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
  () => props.initialTasting,
  (t) => {
    if (!t) return
    coffeeId.value = t.coffeeId
    brewMethod.value = t.brewMethod
    ratingOverall.value = t.ratingOverall ?? null
    ratingAroma.value = t.ratingAroma ?? null
    ratingAcidity.value = t.ratingAcidity ?? null
    ratingSweetness.value = t.ratingSweetness ?? null
    ratingBody.value = t.ratingBody ?? null
    ratingAftertaste.value = t.ratingAftertaste ?? null
    personalNotes.value = t.personalNotes || ''
    isFavorite.value = !!t.isFavorite
    wouldBuyAgain.value = !!t.wouldBuyAgain
  },
  { immediate: true },
)

// Prefill coffee from query param (create mode)
watch(
  () => props.initialCoffeeId,
  (id) => {
    if (id && !coffeeId.value) coffeeId.value = id
  },
  { immediate: true },
)

// ─────────────────────────────────────────────────────────────────────────────
// Derived
// ─────────────────────────────────────────────────────────────────────────────

const coffees = computed<Coffee[]>(() => (coffeesStore.list as Coffee[]) || [])
const selectedCoffee = computed<Coffee | null>(
  () => coffees.value.find(c => c.id === coffeeId.value) ?? null,
)

// CoffeePicker emite null cuando se limpia la selección; el coffeeId interno
// del wizard es una string (vacía = sin selección) para mantener la validación
// existente. Este computed hace de bridge.
const pickerValue = computed<string | null>({
  get: () => coffeeId.value || null,
  set: (v) => { coffeeId.value = v ?? '' },
})

const activeMethods = computed(() => brewMethodOptions.value)

// ─────────────────────────────────────────────────────────────────────────────
// Step navigation + validation
// ─────────────────────────────────────────────────────────────────────────────

function validateStep1(): boolean {
  errors.value = {}
  if (!coffeeId.value) errors.value.coffee = 'Selecciona el café que probaste'
  if (!brewMethod.value) errors.value.method = 'Selecciona el método de extracción'
  return Object.keys(errors.value).length === 0
}

function validateStep2(): boolean {
  errors.value = {}
  if (ratingOverall.value === null) {
    errors.value.overall = 'Asigna una puntuación general'
  }
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
  // Confirm si hay datos sin guardar en create mode. En edit los cambios
  // sin guardar son intencionales del usuario; router.back cubre eso.
  if (props.mode === 'create' && isDirty.value) {
    const ok = await confirm({
      title: '¿Salir sin guardar?',
      message: 'Tu progreso quedará como borrador y podrás continuar la próxima vez que abras el wizard.',
      confirmLabel: 'Salir',
      cancelLabel: 'Seguir aquí',
    })
    if (!ok) return
    // No borramos el draft — se restaura al reabrir el wizard.
  }
  if (props.mode === 'edit' && props.tastingId) {
    router.push(`/app/tastings/${props.tastingId}`)
  }
  else {
    router.push('/app/tastings')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit
// ─────────────────────────────────────────────────────────────────────────────

const submitting = ref(false)
const { medium } = useHaptic()

async function submit() {
  if (submitting.value) return
  if (!validateStep2()) return
  if (!selectedCoffee.value || !brewMethod.value) return
  medium()
  submitting.value = true
  try {
    const c = selectedCoffee.value
    const payload: TastingInput = {
      coffeeId: c.id,
      coffeeName: c.name,
      roasterName: c.roasterName || '',
      brewMethod: brewMethod.value,
      brewDate: props.initialTasting?.brewDate ?? Timestamp.now(),
      ratingOverall: ratingOverall.value as number,
      ratingAroma: ratingAroma.value ?? undefined,
      ratingAcidity: ratingAcidity.value ?? undefined,
      ratingSweetness: ratingSweetness.value ?? undefined,
      ratingBody: ratingBody.value ?? undefined,
      ratingAftertaste: ratingAftertaste.value ?? undefined,
      personalNotes: personalNotes.value.trim() || undefined,
      isFavorite: isFavorite.value || undefined,
      wouldBuyAgain: wouldBuyAgain.value || undefined,
    } as TastingInput

    if (props.mode === 'edit' && props.tastingId) {
      await tastingsStore.update(props.tastingId, payload as Partial<Tasting>)
      router.replace(`/app/tastings/${props.tastingId}`)
    }
    else {
      const id = await tastingsStore.create(payload)
      clearDraft()
      trackEvent('tasting_created', {
        has_attributes: ratingAroma.value !== null
          || ratingAcidity.value !== null
          || ratingSweetness.value !== null
          || ratingBody.value !== null
          || ratingAftertaste.value !== null,
        brew_method: brewMethod.value || 'unknown',
        is_favorite: !!isFavorite.value,
      })
      router.replace(`/app/tastings/${id}`)
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
  1: 'El café',
  2: 'Sentidos',
  3: 'Memoria',
}

const stepEyebrow = computed(
  () => `${step.value} / ${totalSteps} · ${stepTitles[step.value].toUpperCase()}`,
)

const submitLabel = computed(() =>
  props.mode === 'edit' ? '✓ Guardar cambios' : '✓ Guardar cata',
)
</script>

<template>
  <div class="min-h-svh bg-paper text-moss font-sans antialiased flex flex-col">
    <!-- Header -->
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
      <!-- ━━━━━━━━━━ STEP 1 — EL CAFÉ ━━━━━━━━━━ -->
      <section v-if="step === 1">
        <h1 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[34px] sm:text-[40px]">
          ¿Qué <span class="italic text-olive">café</span><br>probaste?
        </h1>
        <p class="subtitle-italic mt-sm">
          Elige uno de tu colección o crea uno nuevo.
        </p>

        <!-- Coffee picker -->
        <CoffeePicker
          v-model="pickerValue"
          label="Café"
          class="mt-xl"
          :error="errors.coffee"
        />

        <!-- Brew method -->
        <div class="mt-xl flex flex-col gap-xs">
          <UiEyebrow>Método</UiEyebrow>
          <div class="flex flex-wrap gap-xxs">
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
          <!-- Descripción del método elegido — evita el tap ciego cuando ves
               12 chips sin explicación. -->
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
        </div>
      </section>

      <!-- ━━━━━━━━━━ STEP 2 — SENTIDOS ━━━━━━━━━━ -->
      <section v-if="step === 2">
        <h1 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[34px] sm:text-[40px]">
          ¿Cómo se <span class="italic text-olive">siente</span>?
        </h1>
        <p class="subtitle-italic mt-sm">
          Los atributos son opcionales — tap o arrastra para puntuar.
        </p>

        <UiRatingBar
          v-model="ratingOverall"
          variant="hero"
          label="Puntuación general"
          class="mt-xl"
        >
          <template #info>
            <UiInfoTrigger :info="TASTING_ATTRIBUTE_INFO.overall" />
          </template>
          <template #trailing>
            <span class="font-mono text-[9px] uppercase tracking-eyebrow text-honey">
              obligatorio
            </span>
          </template>
        </UiRatingBar>
        <p
          v-if="errors.overall"
          class="mt-xs font-mono text-[10px] font-medium uppercase tracking-eyebrow text-terracotta"
        >
          <span aria-hidden="true">— </span>{{ errors.overall }}
        </p>

        <div class="mt-lg flex flex-col">
          <UiRatingBar v-model="ratingAroma" label="Aroma" class="border-b border-moss/10">
            <template #info>
              <UiInfoTrigger :info="TASTING_ATTRIBUTE_INFO.aroma" />
            </template>
          </UiRatingBar>
          <UiRatingBar v-model="ratingAcidity" label="Acidez" class="border-b border-moss/10">
            <template #info>
              <UiInfoTrigger :info="TASTING_ATTRIBUTE_INFO.acidity" />
            </template>
          </UiRatingBar>
          <UiRatingBar v-model="ratingSweetness" label="Dulzura" class="border-b border-moss/10">
            <template #info>
              <UiInfoTrigger :info="TASTING_ATTRIBUTE_INFO.sweetness" />
            </template>
          </UiRatingBar>
          <UiRatingBar v-model="ratingBody" label="Cuerpo" class="border-b border-moss/10">
            <template #info>
              <UiInfoTrigger :info="TASTING_ATTRIBUTE_INFO.body" />
            </template>
          </UiRatingBar>
          <UiRatingBar v-model="ratingAftertaste" label="Retrogusto">
            <template #info>
              <UiInfoTrigger :info="TASTING_ATTRIBUTE_INFO.aftertaste" />
            </template>
          </UiRatingBar>
        </div>
      </section>

      <!-- ━━━━━━━━━━ STEP 3 — MEMORIA ━━━━━━━━━━ -->
      <section v-if="step === 3">
        <h1 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[34px] sm:text-[40px]">
          ¿Qué <span class="italic text-olive">recordarás</span><br>de esta taza?
        </h1>
        <p class="subtitle-italic mt-sm">
          Una frase basta. Lo que se te quedó.
        </p>

        <!-- Note card -->
        <div class="mt-xl rounded-card-lg bg-surface-2 p-md">
          <UiEyebrow>Tu nota</UiEyebrow>
          <textarea
            v-model="personalNotes"
            rows="3"
            placeholder="Dulce como postre, con un final a panela…"
            class="mt-xs w-full bg-transparent border-0 p-0 outline-none resize-none font-display italic text-[16px] text-moss placeholder:text-moss-ghost"
          />
        </div>

        <!-- Toggles -->
        <div class="mt-md flex gap-xs">
          <button
            type="button"
            class="flex-1 inline-flex items-center justify-center gap-xs rounded-cta px-md py-sm text-[14px] font-sans transition-colors duration-150 ease-sorbo"
            :class="
              isFavorite
                ? 'bg-olive text-paper'
                : 'bg-surface-2 text-moss hover:bg-surface'
            "
            @click="isFavorite = !isFavorite"
          >
            <Icon
              name="lucide:heart"
              class="size-4"
              :class="isFavorite ? 'fill-current' : ''"
              aria-hidden="true"
            />
            Favorito
          </button>
          <button
            type="button"
            class="flex-1 inline-flex items-center justify-center gap-xs rounded-cta px-md py-sm text-[14px] font-sans transition-colors duration-150 ease-sorbo border"
            :class="
              wouldBuyAgain
                ? 'bg-olive text-paper border-olive'
                : 'bg-transparent text-moss border-moss/15 hover:bg-surface-2'
            "
            @click="wouldBuyAgain = !wouldBuyAgain"
          >
            <Icon name="lucide:rotate-ccw" class="size-4" />
            Repetiría
          </button>
        </div>

        <!-- Preview -->
        <div v-if="selectedCoffee && ratingOverall !== null" class="mt-xl rounded-card-lg bg-moss p-md">
          <div class="flex items-center justify-between gap-md">
            <UiEyebrow class="text-paper">Vista previa</UiEyebrow>
            <span class="font-display text-[28px] leading-none text-paper">
              {{ ratingOverall.toFixed(1) }}
            </span>
          </div>
          <div class="mt-xs font-display text-[24px] leading-none text-paper">
            {{ selectedCoffee.name.endsWith('.') ? selectedCoffee.name.slice(0, -1) : selectedCoffee.name }}
          </div>
        </div>
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
            {{ stepTitles[(step + 1) as 1 | 2 | 3] }}
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
  </div>
</template>

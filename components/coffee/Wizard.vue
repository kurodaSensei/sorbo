<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { Coffee, CoffeeInput, CoffeeProcess, PurchaseChannel, RoastLevel, Roaster } from '~/types'
import type { RoasterValue } from '~/components/roaster/Picker.vue'
import { PURCHASE_CHANNEL_OPTIONS, PURCHASE_REFERENCE_PLACEHOLDER } from '~/utils/constants'

const props = withDefaults(
  defineProps<{
    /** When 'edit', submits via update; otherwise creates a new coffee. */
    mode?: 'create' | 'edit'
    /** Existing coffee to prefill the form with (edit mode). */
    initialCoffee?: Coffee | null
    /** Required when mode === 'edit'. */
    coffeeId?: string
  }>(),
  {
    mode: 'create',
    initialCoffee: null,
  },
)

const router = useRouter()
const coffeesStore = useCoffeesStore()
const roastersStore = useRoastersStore()
const settingsStore = useSettingsStore()
const { processOptions, flavorNoteOptions } = useCatalog()
const { trackEvent } = useAnalytics()
const { confirm } = useConfirm()

// Descripción corta por proceso — Jordan sin background no distingue
// washed/natural/honey. Se muestra al elegir uno.
const PROCESS_DESCRIPTION: Record<string, string> = {
  washed: 'Fermentado en agua, taza limpia y clara',
  natural: 'Cereza al sol, más dulce y frutal',
  honey: 'Mucílago parcial, punto medio entre los dos',
  anaerobic: 'Sin oxígeno, sabores intensos y experimentales',
  carbonic: 'CO₂ presurizado, notas vinosas',
  experimental: 'Métodos innovadores del productor',
  other: 'Otro método',
}

const processDescription = computed(() =>
  process.value ? PROCESS_DESCRIPTION[process.value] || '' : '',
)

// ─────────────────────────────────────────────────────────────────────────────
// Wizard state
// ─────────────────────────────────────────────────────────────────────────────

const step = ref<1 | 2 | 3>(1)
const totalSteps = 3

// Step 1 — IDENTIDAD
const name = ref('')
const roaster = ref<RoasterValue | null>(null)
const variety = ref('')
// Process puede ser un valor del enum CoffeeProcess o un id custom (`custom_xxx`)
// proveniente del catálogo del usuario.
const process = ref<string>('')
const showMoreIdentity = ref(false)

// Step 2 — ORIGEN
const country = ref('')
const region = ref('')
const altitude = ref<number | null>(null)
const farm = ref('')
const producer = ref('')
const showMoreOrigin = ref(false)
const customCountry = ref('')
const showCustomCountryInput = ref(false)

// Step 3 — SABOR
const flavorNotes = ref<string[]>([])
const customNote = ref('')
const showCustomNoteInput = ref(false)
const roastLevel = ref<RoastLevel | ''>('')
const price = ref<number | null>(null)
const weight = ref<number | null>(null)
const scaScore = ref<number | null>(null)
const showSca = ref(false)
const purchaseChannel = ref<PurchaseChannel | ''>('')
const purchaseReference = ref('')
const showPurchase = ref(false)

// ─────────────────────────────────────────────────────────────────────────────
// Prefill from initialCoffee (edit mode)
// ─────────────────────────────────────────────────────────────────────────────

watch(
  () => props.initialCoffee,
  (c) => {
    if (!c) return
    name.value = c.name || ''
    roaster.value = c.roasterName
      ? { id: c.roasterId, name: c.roasterName }
      : null
    variety.value = c.variety || ''
    process.value = c.process || ''
    if (c.variety || c.process) showMoreIdentity.value = true

    country.value = c.originCountry || ''
    region.value = c.originRegion || ''
    altitude.value = c.altitude ?? null
    farm.value = c.originFarm || ''
    producer.value = c.originProducer || ''
    if (c.originFarm || c.originProducer) showMoreOrigin.value = true

    flavorNotes.value = [...(c.flavorNotes || [])]
    roastLevel.value = (c.roastLevel as RoastLevel) || ''
    price.value = c.price ?? null
    weight.value = c.weight ?? null
    scaScore.value = c.scaScore ?? null
    if (c.scaScore !== undefined) showSca.value = true

    purchaseChannel.value = (c.purchaseChannel as PurchaseChannel) || ''
    purchaseReference.value = c.purchaseReference || ''
    if (c.purchaseChannel || c.purchaseReference) showPurchase.value = true
  },
  { immediate: true },
)

// ─────────────────────────────────────────────────────────────────────────────
// Static options
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRIES = ['Colombia', 'Etiopía', 'Kenia', 'Brasil', 'Costa Rica', 'Guatemala']
const ROAST_LEVELS: { value: RoastLevel; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'medium', label: 'Medio' },
  { value: 'dark', label: 'Oscuro' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Roaster hint para "Dónde lo compré"
// ─────────────────────────────────────────────────────────────────────────────

const selectedRoaster = computed<Roaster | null>(() => {
  if (!roaster.value?.id) return null
  return (roastersStore.list as Roaster[]).find(r => r.id === roaster.value!.id) ?? null
})

const roasterPurchaseHint = computed(() => {
  const r = selectedRoaster.value
  if (!r) return ''
  const hints: string[] = []
  if (r.instagram) hints.push(`Instagram ${r.instagram}`)
  if (r.website) hints.push(`Web ${r.website}`)
  if (hints.length === 0) return ''
  return `Esta marca tiene ${hints.join(' · ')}`
})

const referencePlaceholder = computed(() =>
  PURCHASE_REFERENCE_PLACEHOLDER[purchaseChannel.value] || 'URL, @handle o nombre',
)

// ─────────────────────────────────────────────────────────────────────────────
// Step navigation + validation
// ─────────────────────────────────────────────────────────────────────────────

const errors = ref<Record<string, string>>({})

// ─────────────────────────────────────────────────────────────────────────────
// Autosave a sessionStorage (create mode) — mismo pattern del tasting wizard.
// ponytail: sessionStorage local, muere con la pestaña; borrador durable
// solo hasta que el usuario reabra el wizard en la misma sesión.
// ─────────────────────────────────────────────────────────────────────────────

const DRAFT_KEY = 'sorbo:coffee-wizard:draft'

function snapshot() {
  return {
    name: name.value,
    roaster: roaster.value,
    variety: variety.value,
    process: process.value,
    country: country.value,
    region: region.value,
    altitude: altitude.value,
    farm: farm.value,
    producer: producer.value,
    flavorNotes: flavorNotes.value.slice(),
    roastLevel: roastLevel.value,
    price: price.value,
    weight: weight.value,
    scaScore: scaScore.value,
    purchaseChannel: purchaseChannel.value,
    purchaseReference: purchaseReference.value,
    showMoreIdentity: showMoreIdentity.value,
    showMoreOrigin: showMoreOrigin.value,
    showSca: showSca.value,
    showPurchase: showPurchase.value,
    step: step.value,
    savedAt: Date.now(),
  }
}

const isDirty = computed(() =>
  !!(
    name.value.trim()
    || roaster.value?.name
    || variety.value.trim()
    || process.value
    || country.value
    || region.value.trim()
    || altitude.value !== null
    || farm.value.trim()
    || producer.value.trim()
    || flavorNotes.value.length
    || roastLevel.value
    || price.value !== null
    || weight.value !== null
    || scaScore.value !== null
    || purchaseChannel.value
    || purchaseReference.value.trim()
  ),
)

onMounted(async () => {
  // Belt-and-suspenders: aunque useCatalog dispara settings.load internamente,
  // aquí lo esperamos explícito para que los chips de proceso/nota estén
  // renderizados con los customs desde el primer paint del wizard.
  await settingsStore.load()

  if (props.mode !== 'create' || props.initialCoffee) return
  if (typeof window === 'undefined') return
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const d = JSON.parse(raw)
    if (!d || Date.now() - d.savedAt > 24 * 60 * 60 * 1000) return
    name.value = d.name || ''
    roaster.value = d.roaster || null
    variety.value = d.variety || ''
    process.value = d.process || ''
    country.value = d.country || ''
    region.value = d.region || ''
    altitude.value = d.altitude ?? null
    farm.value = d.farm || ''
    producer.value = d.producer || ''
    flavorNotes.value = Array.isArray(d.flavorNotes) ? d.flavorNotes : []
    roastLevel.value = d.roastLevel || ''
    price.value = d.price ?? null
    weight.value = d.weight ?? null
    scaScore.value = d.scaScore ?? null
    purchaseChannel.value = d.purchaseChannel || ''
    purchaseReference.value = d.purchaseReference || ''
    showMoreIdentity.value = !!d.showMoreIdentity
    showMoreOrigin.value = !!d.showMoreOrigin
    showSca.value = !!d.showSca
    showPurchase.value = !!d.showPurchase
    step.value = d.step || 1
  }
  catch { /* draft corrupto */ }
})

watch(
  [name, roaster, variety, process, country, region, altitude, farm, producer,
    flavorNotes, roastLevel, price, weight, scaScore, purchaseChannel,
    purchaseReference, showMoreIdentity, showMoreOrigin, showSca, showPurchase, step],
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
    catch { /* quota */ }
  },
  { deep: true },
)

function clearDraft() {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.removeItem(DRAFT_KEY) }
  catch { /* ignore */ }
}

function validateStep1(): boolean {
  errors.value = {}
  if (!name.value.trim()) errors.value.name = 'El nombre es obligatorio'
  // Marca es opcional — no todos los cafés vienen con info clara del
  // tostador y queremos que registrar una bolsa cualquiera sea fácil.
  return Object.keys(errors.value).length === 0
}

function next() {
  if (step.value === 1 && !validateStep1()) return
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
  if (props.mode === 'edit' && props.coffeeId) {
    router.push(`/app/coffees/${props.coffeeId}`)
  }
  else {
    router.push('/app/coffees')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Flavor chips
// ─────────────────────────────────────────────────────────────────────────────

function toggleFlavor(note: string) {
  const idx = flavorNotes.value.indexOf(note)
  if (idx === -1) flavorNotes.value.push(note)
  else flavorNotes.value.splice(idx, 1)
}

const customNoteInputRef = ref<HTMLInputElement | null>(null)

// Cuando se abre el input "+ propia", enfocar en el siguiente tick.
// autofocus HTML no dispara en toggles dinámicos (solo en carga inicial
// del documento).
watch(showCustomNoteInput, (open) => {
  if (open) nextTick(() => customNoteInputRef.value?.focus())
})

function commitCustomNote() {
  const v = customNote.value.trim()
  if (v && !flavorNotes.value.includes(v)) {
    flavorNotes.value.push(v)
    // Además, persistir en el catálogo del usuario para que esté disponible
    // en el siguiente café sin tener que re-tipearla. Fire-and-forget:
    // si Firestore falla, el chip queda ad-hoc en esta cata solo.
    settingsStore.addFlavorNote(v).catch(() => {})
  }
  customNote.value = ''
  showCustomNoteInput.value = false
}

function commitCustomCountry() {
  const v = customCountry.value.trim()
  if (v) country.value = v
  customCountry.value = ''
  showCustomCountryInput.value = false
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit
// ─────────────────────────────────────────────────────────────────────────────

const submitting = ref(false)
const { medium } = useHaptic()

async function submit() {
  if (submitting.value) return
  medium()
  submitting.value = true
  try {
    const payload: CoffeeInput = {
      name: name.value.trim(),
      roasterId: roaster.value?.id,
      roasterName: roaster.value?.name?.trim() || undefined,
      variety: variety.value.trim() || '',
      process: (process.value || 'other') as CoffeeProcess,
      originRegion: region.value.trim() || '',
      originCountry: country.value || '',
      originFarm: farm.value.trim() || undefined,
      originProducer: producer.value.trim() || undefined,
      altitude: altitude.value ?? undefined,
      scaScore: scaScore.value ?? undefined,
      roastLevel: (roastLevel.value || undefined) as RoastLevel | undefined,
      price: price.value ?? undefined,
      weight: weight.value ?? undefined,
      flavorNotes: flavorNotes.value.slice(),
      purchaseChannel: (purchaseChannel.value || undefined) as PurchaseChannel | undefined,
      purchaseReference: purchaseReference.value.trim() || undefined,
    } as CoffeeInput

    if (props.mode === 'edit' && props.coffeeId) {
      await coffeesStore.update(props.coffeeId, payload as Partial<Coffee>)
      router.replace(`/app/coffees/${props.coffeeId}`)
    }
    else {
      const id = await coffeesStore.create(payload)
      clearDraft()
      trackEvent('coffee_created', {
        has_sca_score: scaScore.value !== null && scaScore.value !== undefined,
        process: process.value || 'other',
        has_notes: flavorNotes.value.length > 0,
      })
      router.replace(`/app/coffees/${id}`)
    }
  }
  catch {
    // Toast already surfaced by store
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
  2: 'Origen',
  3: 'Sabor',
}

const stepEyebrow = computed(
  () => `${step.value} / ${totalSteps} · ${stepTitles[step.value].toUpperCase()}`,
)

const submitLabel = computed(() =>
  props.mode === 'edit' ? '✓ Guardar cambios' : '✓ Crear café',
)
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
          ¿Cómo se llama<br>este <span class="italic text-olive">café</span>?
        </h1>
        <p class="subtitle-italic mt-sm">
          Solo el nombre es obligatorio.
        </p>

        <div class="mt-xl flex flex-col gap-xs">
          <UiInput
            v-model="name"
            label="Nombre"
            placeholder="Rock natural"
            :error="errors.name"
          />
          <RoasterPicker
            v-model="roaster"
            label="Marca"
            placeholder="Tostador, tienda, marca…"
            :error="errors.roaster"
          />
        </div>

        <button
          v-if="!showMoreIdentity"
          type="button"
          class="mt-lg inline-flex items-center font-mono text-[10px] font-medium uppercase tracking-eyebrow text-olive hover:opacity-80 transition-opacity"
          @click="showMoreIdentity = true"
        >
          + más detalles (variedad, proceso)
        </button>

        <div v-else class="mt-lg flex flex-col gap-md">
          <VarietyPicker
            v-model="variety"
            label="Variedad"
            placeholder="Caturra, Geisha…"
          />
          <div class="flex flex-col gap-xs">
            <UiEyebrow>Proceso</UiEyebrow>
            <div class="flex flex-wrap gap-xxs">
              <UiChip
                v-for="p in processOptions"
                :key="p.value"
                interactive
                :variant="process === p.value ? 'active' : 'default'"
                @click="process = process === p.value ? '' : p.value"
              >
                {{ p.label }}
              </UiChip>
            </div>
            <!-- Descripción del proceso elegido — sin vocabulario asumido,
                 Jordan no distingue washed/natural/honey solo por el label. -->
            <p
              v-if="processDescription"
              class="mt-xxs font-display italic text-[13px] text-moss-soft leading-snug"
            >
              {{ processDescription }}
            </p>
          </div>
        </div>
      </section>

      <!-- ━━━━━━━━━━━━ STEP 2 — ORIGEN ━━━━━━━━━━━━ -->
      <section v-if="step === 2">
        <h1 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[34px] sm:text-[40px]">
          ¿De dónde<br><span class="italic text-olive">viene</span>?
        </h1>
        <p class="subtitle-italic mt-sm">
          País y región dan contexto al sabor.
        </p>

        <div class="mt-xl flex flex-col gap-lg">
          <div class="flex flex-col gap-xs">
            <UiEyebrow>País</UiEyebrow>
            <div class="flex flex-wrap gap-xxs">
              <UiChip
                v-for="c in COUNTRIES"
                :key="c"
                interactive
                :variant="country === c ? 'active' : 'default'"
                @click="country = country === c ? '' : c"
              >
                {{ c }}
              </UiChip>
              <!-- Si el país actual no está en la lista, lo mostramos como chip
                   activo para que se vea seleccionado y se pueda desmarcar. -->
              <UiChip
                v-if="country && !COUNTRIES.includes(country)"
                interactive
                variant="active"
                @click="country = ''"
              >
                {{ country }}
              </UiChip>
              <template v-if="!showCustomCountryInput">
                <UiChip
                  variant="ghost"
                  interactive
                  @click="showCustomCountryInput = true"
                >
                  + otro
                </UiChip>
              </template>
              <template v-else>
                <input
                  v-model="customCountry"
                  type="text"
                  placeholder="País"
                  class="rounded-pill bg-surface-2 px-md h-[25px] font-mono text-[11px] uppercase tracking-eyebrow text-moss outline-none focus:bg-paper border border-moss/20"
                  autofocus
                  @keydown.enter.prevent="commitCustomCountry"
                  @blur="commitCustomCountry"
                >
              </template>
            </div>
          </div>

          <UiInput v-model="region" label="Región" placeholder="Tarqui, Huila" />

          <div class="flex flex-col gap-xs pt-[14px] pb-[13px] border-b border-moss/10">
            <div class="flex items-baseline justify-between gap-md">
              <label for="altitude" class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft">
                <span aria-hidden="true">— </span>Altitud
                <span class="lowercase normal-case font-display italic text-moss-soft">opcional</span>
              </label>
              <span class="font-mono text-[12px] text-moss">
                {{ altitude ?? '—' }} msnm
              </span>
            </div>
            <input
              id="altitude"
              v-model.number="altitude"
              type="range"
              min="600"
              max="2400"
              step="10"
              class="mt-xs w-full accent-olive"
            >
            <div class="flex justify-between font-mono text-[10px] text-moss-ghost">
              <span>600</span><span>2,400</span>
            </div>
          </div>

          <button
            v-if="!showMoreOrigin"
            type="button"
            class="inline-flex items-center font-mono text-[10px] font-medium uppercase tracking-eyebrow text-olive hover:opacity-80 transition-opacity"
            @click="showMoreOrigin = true"
          >
            + finca, productor
          </button>

          <div v-else class="flex flex-col gap-md">
            <UiInput v-model="farm" label="Finca" placeholder="Nombre de la finca" />
            <UiInput v-model="producer" label="Productor" placeholder="Nombre del productor" />
          </div>
        </div>
      </section>

      <!-- ━━━━━━━━━━━━ STEP 3 — SABOR ━━━━━━━━━━━━ -->
      <section v-if="step === 3">
        <h1 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[34px] sm:text-[40px]">
          ¿A qué<br><span class="italic text-olive">sabe</span>?
        </h1>
        <p class="subtitle-italic mt-sm">
          Toca las que reconoces en taza.
        </p>

        <div class="mt-xl flex flex-col gap-lg">
          <div class="flex flex-wrap gap-xxs">
            <UiChip
              v-for="opt in flavorNoteOptions"
              :key="opt"
              interactive
              :variant="flavorNotes.includes(opt) ? 'active' : 'default'"
              @click="toggleFlavor(opt)"
            >
              {{ opt }}
            </UiChip>
            <UiChip
              v-for="adhoc in flavorNotes.filter(n => !flavorNoteOptions.includes(n))"
              :key="adhoc"
              interactive
              variant="active"
              @click="toggleFlavor(adhoc)"
            >
              {{ adhoc }}
            </UiChip>
            <template v-if="!showCustomNoteInput">
              <UiChip
                variant="ghost"
                interactive
                @click="showCustomNoteInput = true"
              >
                + propia
              </UiChip>
            </template>
            <template v-else>
              <input
                ref="customNoteInputRef"
                v-model="customNote"
                type="text"
                placeholder="Nota personalizada"
                class="rounded-pill bg-surface-2 px-md h-[25px] font-mono text-[11px] uppercase tracking-eyebrow text-moss outline-none focus:bg-paper border border-moss/20"
                @keydown.enter.prevent="commitCustomNote"
                @blur="commitCustomNote"
              >
            </template>
          </div>

          <div class="flex flex-col gap-xs">
            <UiEyebrow>Tueste</UiEyebrow>
            <div class="flex flex-wrap gap-xxs">
              <UiChip
                v-for="r in ROAST_LEVELS"
                :key="r.value"
                interactive
                :variant="roastLevel === r.value ? 'active' : 'default'"
                @click="roastLevel = roastLevel === r.value ? '' : r.value"
              >
                {{ r.label }}
              </UiChip>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-md">
            <UiInput
              v-model.number="price"
              label="Precio"
              placeholder="$60,000"
              type="number"
              inputmode="numeric"
            />
            <UiInput
              v-model.number="weight"
              label="Peso"
              placeholder="250 g"
              type="number"
              inputmode="numeric"
            />
          </div>

          <button
            v-if="!showSca"
            type="button"
            class="inline-flex items-center font-mono text-[10px] font-medium uppercase tracking-eyebrow text-olive hover:opacity-80 transition-opacity"
            @click="showSca = true"
          >
            + Puntaje SCA (opcional)
          </button>
          <div v-else class="flex flex-col gap-xs pt-[14px] pb-[13px] border-b border-moss/10 transition-colors duration-150 ease-sorbo" :class="scaScore ? 'border-moss' : 'border-moss/10'">
            <div class="flex items-baseline justify-between gap-md">
              <label for="sca-score" class="font-mono text-[10px] font-medium uppercase tracking-eyebrow text-moss-soft">
                <span aria-hidden="true">— </span>Puntaje SCA
                <span class="lowercase normal-case font-display italic text-moss-soft">opcional · 0-100</span>
              </label>
              <button
                type="button"
                class="font-mono text-[10px] uppercase tracking-eyebrow text-moss-ghost hover:text-moss transition-colors"
                @click="showSca = false; scaScore = null"
              >
                Quitar
              </button>
            </div>
            <input
              id="sca-score"
              v-model.number="scaScore"
              type="number"
              inputmode="decimal"
              min="0"
              max="100"
              step="0.1"
              placeholder="86.5"
              class="w-full bg-transparent border-0 p-0 leading-none text-moss outline-none font-display text-[18px] placeholder:text-moss-ghost placeholder:font-display placeholder:italic"
            >
            <p class="mt-xxs font-display italic text-[12px] text-moss-soft leading-snug">
              Sistema profesional de la Specialty Coffee Association. 80+ ya es café de especialidad.
            </p>
          </div>

          <!-- Dónde lo compré (opcional) -->
          <button
            v-if="!showPurchase"
            type="button"
            class="inline-flex items-center font-mono text-[10px] font-medium uppercase tracking-eyebrow text-olive hover:opacity-80 transition-opacity"
            @click="showPurchase = true"
          >
            + Dónde lo compré (opcional)
          </button>
          <div v-else class="flex flex-col gap-md pt-[14px] border-t border-moss/10">
            <div class="flex items-baseline justify-between gap-md">
              <UiEyebrow>Dónde lo compré</UiEyebrow>
              <button
                type="button"
                class="font-mono text-[10px] uppercase tracking-eyebrow text-moss-ghost hover:text-moss transition-colors"
                @click="showPurchase = false; purchaseChannel = ''; purchaseReference = ''"
              >
                Quitar
              </button>
            </div>
            <div class="flex flex-wrap gap-xxs">
              <UiChip
                v-for="opt in PURCHASE_CHANNEL_OPTIONS"
                :key="opt.value"
                interactive
                :variant="purchaseChannel === opt.value ? 'active' : 'default'"
                @click="purchaseChannel = purchaseChannel === opt.value ? '' : opt.value"
              >
                {{ opt.label }}
              </UiChip>
            </div>
            <UiInput
              v-model="purchaseReference"
              :placeholder="referencePlaceholder"
              label="Referencia"
            />
            <p
              v-if="roasterPurchaseHint"
              class="font-display italic text-[13px] text-moss-soft leading-relaxed"
            >
              {{ roasterPurchaseHint }}
            </p>
          </div>
        </div>
      </section>
    </main>

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

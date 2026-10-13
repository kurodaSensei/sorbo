<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { Coffee, CoffeeInput, CoffeeProcess, RoastLevel, Tasting } from '~/types'
import { dayLabel, hourLabel, toDate } from '~/utils/dates'

// Editar café v2 (design/v2/prototipo, EditCafe): una pantalla con secciones
// plegables, todo opcional salvo el nombre. Sustituye al wizard de 3 pasos.
const props = defineProps<{ coffee?: Coffee | null }>()

const router = useRouter()
const coffeesStore = useCoffeesStore()
const tastingsStore = useTastingsStore()
const settings = useSettingsStore()
const ui = useUiStore()
const { processOptions, varieties, getBrewMethodLabel } = useCatalog()
const { confirm } = useConfirm()

const isNew = computed(() => !props.coffee)

onMounted(() => {
  if (!tastingsStore.list.length) tastingsStore.loadAll().catch(() => {})
})

const f = reactive({
  name: props.coffee?.name ?? '',
  brand: props.coffee?.roasterName ?? '',
  country: props.coffee?.originCountry ?? '',
  region: props.coffee?.originRegion ?? '',
  process: (props.coffee?.process && props.coffee.process !== 'other' ? props.coffee.process : '') as string,
  variety: props.coffee?.variety ?? '',
  roast: props.coffee?.roastLevel ?? ('' as RoastLevel | ''),
  price: props.coffee?.price ? String(props.coffee.price) : '',
  weight: props.coffee?.weight ? String(props.coffee.weight) : '',
  where: props.coffee?.purchaseReference ?? '',
})

const ROASTS: { label: string, value: RoastLevel, band: RoastLevel[] }[] = [
  { label: 'Claro', value: 'light', band: ['light', 'medium_light'] },
  { label: 'Medio', value: 'medium', band: ['medium'] },
  { label: 'Oscuro', value: 'dark', band: ['medium_dark', 'dark'] },
]
const roastLabel = computed(() => ROASTS.find(r => f.roast && r.band.includes(f.roast as RoastLevel))?.label ?? '')

const open = reactive({ origin: false, process: !!f.process, roast: false, buy: false })
const pending = (s: string) => s || 'Sin completar'
const originSummary = computed(() => pending([f.region, f.country].filter(Boolean).join(', ')))
const processSummary = computed(() => pending([f.process && processOptions.value.find(p => p.value === f.process)?.label, f.variety].filter(Boolean).join(' · ')))
const buySummary = computed(() => pending([f.price && `$${f.price}`, f.weight && `${f.weight} g`, f.where].filter(Boolean).join(' · ')))

// ─── Proceso propio ─────────────────────────────────────────────────────────
const addingProcess = ref(false)
const newProcess = ref('')
async function addProcess() {
  const label = newProcess.value.trim()
  addingProcess.value = false
  newProcess.value = ''
  if (!label) return
  await settings.addProcess(label)
  const created = processOptions.value.find(p => p.label === label)
  if (created) f.process = created.value
}

// ─── Notas de este café ─────────────────────────────────────────────────────
const notes = computed(() => props.coffee
  ? (tastingsStore.list as Tasting[]).filter(t => t.coffeeId === props.coffee!.id)
  : [])

function noteEyebrow(t: Tasting) {
  const d = toDate(t.brewDate) || toDate(t.createdAt)
  const method = t.brewMethod && t.brewMethod !== 'other' ? getBrewMethodLabel(t.brewMethod) : ''
  return [d && `${dayLabel(d)} ${hourLabel(d)}`, method].filter(Boolean).join(' · ')
}

// ─── Guardar / eliminar ─────────────────────────────────────────────────────
const saving = ref(false)

async function save() {
  if (!f.name.trim() || saving.value) return
  saving.value = true
  const data = {
    name: f.name.trim(),
    roasterName: f.brand.trim() || undefined,
    originCountry: f.country.trim(),
    originRegion: f.region.trim(),
    process: (f.process || 'other') as CoffeeProcess,
    variety: f.variety.trim(),
    roastLevel: (f.roast || undefined) as RoastLevel | undefined,
    price: Number(f.price) || undefined,
    weight: Number(f.weight) || undefined,
    purchaseReference: f.where.trim() || undefined,
  }
  try {
    if (props.coffee) {
      await coffeesStore.update(props.coffee.id, data)
      router.back()
    }
    else {
      const id = await coffeesStore.create({ ...data, flavorNotes: [] } as CoffeeInput)
      router.replace(`/app/coffees/${id}`)
    }
  }
  catch { /* el store ya mostró el aviso */ }
  finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.coffee) return
  const ok = await confirm({
    title: 'Eliminar café',
    message: notes.value.length
      ? `«${props.coffee.name}» sale de Mis cafés. Sus ${notes.value.length} notas se quedan en tu Diario.`
      : `«${props.coffee.name}» sale de Mis cafés. No se puede deshacer.`,
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  try {
    await coffeesStore.remove(props.coffee.id)
    router.replace('/app/coffees')
  }
  catch { /* aviso ya mostrado */ }
}

function back() {
  if (window.history.length > 1) router.back()
  else router.replace('/app/coffees')
}
</script>

<template>
  <div class="cf">
    <header class="cf-head">
      <button type="button" class="cf-icon" aria-label="Volver" @click="back">
        <AppIcon name="right" :size="22" :stroke="2" style="transform: rotate(180deg)" />
      </button>
      <h1 class="cf-title">{{ isNew ? 'Nuevo café' : 'Editar café' }}</h1>
    </header>

    <div class="cf-body">
      <div class="cf-field">
        <label for="cf-name" class="cf-label">Nombre</label>
        <input id="cf-name" v-model="f.name" class="cf-input" placeholder="Nombre del café" autocomplete="off">
      </div>
      <div class="cf-field">
        <label for="cf-brand" class="cf-label">Marca</label>
        <input id="cf-brand" v-model="f.brand" class="cf-input" placeholder="Quién lo tuesta" autocomplete="off">
      </div>
      <p class="cf-cap">
        <template v-if="!isNew">{{ notes.length ? `${notes.length} ${notes.length === 1 ? 'nota' : 'notas'} de este café` : 'Todavía no lo has anotado' }} · </template>todos los campos son opcionales
      </p>

      <div class="cf-folds">
        <section class="cf-fold">
          <button type="button" class="cf-fold-h" :aria-expanded="open.origin" @click="open.origin = !open.origin">
            <span class="cf-col"><span class="cf-strong">Origen</span><span v-if="!open.origin" class="cf-cap">{{ originSummary }}</span></span>
            <AppIcon name="down" :size="20" :stroke="2" :class="{ 'cf-rot': open.origin }" />
          </button>
          <div v-if="open.origin" class="cf-fold-b cf-two">
            <div class="cf-field"><label for="cf-region" class="cf-label">Región</label><input id="cf-region" v-model="f.region" class="cf-input" placeholder="Huila"></div>
            <div class="cf-field"><label for="cf-country" class="cf-label">País</label><input id="cf-country" v-model="f.country" class="cf-input" placeholder="Colombia"></div>
          </div>
        </section>

        <section class="cf-fold">
          <button type="button" class="cf-fold-h" :aria-expanded="open.process" @click="open.process = !open.process">
            <span class="cf-col"><span class="cf-strong">Proceso y variedad</span><span v-if="!open.process" class="cf-cap">{{ processSummary }}</span></span>
            <AppIcon name="down" :size="20" :stroke="2" :class="{ 'cf-rot': open.process }" />
          </button>
          <div v-if="open.process" class="cf-fold-b">
            <span class="cf-label">Proceso</span>
            <div class="cf-wrap">
              <button
                v-for="p in processOptions.filter(p => p.value !== 'other')"
                :key="p.value"
                type="button"
                class="cf-chip"
                :aria-pressed="f.process === p.value"
                @click="f.process = f.process === p.value ? '' : p.value"
              >
                {{ p.label }}
              </button>
              <input v-if="addingProcess" v-model="newProcess" class="cf-chip cf-chip-in" aria-label="Nuevo proceso" placeholder="Proceso" autofocus @keydown.enter.prevent="addProcess" @blur="addProcess">
              <button v-else type="button" class="cf-chip cf-chip-add" @click="addingProcess = true">+ Nuevo proceso</button>
            </div>
            <div class="cf-field">
              <label for="cf-variety" class="cf-label">Variedad</label>
              <input id="cf-variety" v-model="f.variety" class="cf-input" list="cf-varieties" placeholder="Caturra, Geisha…">
              <datalist id="cf-varieties"><option v-for="v in varieties" :key="v" :value="v" /></datalist>
            </div>
          </div>
        </section>

        <section class="cf-fold">
          <button type="button" class="cf-fold-h" :aria-expanded="open.roast" @click="open.roast = !open.roast">
            <span class="cf-col"><span class="cf-strong">Tueste</span><span v-if="!open.roast" class="cf-cap">{{ pending(roastLabel) }}</span></span>
            <AppIcon name="down" :size="20" :stroke="2" :class="{ 'cf-rot': open.roast }" />
          </button>
          <div v-if="open.roast" class="cf-fold-b">
            <div class="cf-seg" role="group" aria-label="Tueste">
              <button
                v-for="r in ROASTS"
                :key="r.value"
                type="button"
                :aria-pressed="!!f.roast && r.band.includes(f.roast as RoastLevel)"
                @click="f.roast = r.band.includes(f.roast as RoastLevel) ? '' : r.value"
              >
                {{ r.label }}
              </button>
            </div>
          </div>
        </section>

        <section class="cf-fold">
          <button type="button" class="cf-fold-h" :aria-expanded="open.buy" @click="open.buy = !open.buy">
            <span class="cf-col"><span class="cf-strong">Compra</span><span v-if="!open.buy" class="cf-cap">{{ buySummary }}</span></span>
            <AppIcon name="down" :size="20" :stroke="2" :class="{ 'cf-rot': open.buy }" />
          </button>
          <div v-if="open.buy" class="cf-fold-b">
            <div class="cf-two">
              <div class="cf-field"><label for="cf-price" class="cf-label">Precio de la bolsa</label><input id="cf-price" v-model="f.price" class="cf-input cf-mono" inputmode="decimal"></div>
              <div class="cf-field"><label for="cf-weight" class="cf-label">Peso (g)</label><input id="cf-weight" v-model="f.weight" class="cf-input cf-mono" inputmode="numeric"></div>
            </div>
            <div class="cf-field"><label for="cf-where" class="cf-label">Dónde lo compré</label><input id="cf-where" v-model="f.where" class="cf-input" placeholder="Tienda, web o @cuenta"></div>
          </div>
        </section>
      </div>

      <section v-if="!isNew" class="cf-notes">
        <div class="cf-notes-h">
          <span class="cf-label">Tus notas</span>
          <button type="button" class="cf-link" @click="ui.openNoteSheet(coffee!.id)">+ Anotar este café</button>
        </div>
        <NoteCard
          v-for="t in notes"
          :key="t.id"
          :to="`/app/tastings/${t.id}`"
          :coffee-id="t.coffeeId"
          :eyebrow="noteEyebrow(t)"
          :name="t.coffeeName"
          :flavors="t.flavorNotes"
          :quote="t.personalNotes"
          :rating="t.ratingOverall"
        />
      </section>

      <button v-if="!isNew" type="button" class="cf-delete" @click="remove">Eliminar café</button>
    </div>

    <footer class="cf-foot">
      <button type="button" class="cf-save" :disabled="!f.name.trim() || saving" @click="save">
        {{ saving ? 'Guardando…' : 'Guardar café' }}
      </button>
    </footer>
  </div>
</template>

<style scoped>
.cf { max-width: 640px; margin: 0 auto; min-height: 100svh; padding-bottom: calc(96px + env(safe-area-inset-bottom)); color: var(--ink); font-family: var(--font-sans); background: var(--bg); }
.cf-head { display: flex; align-items: center; gap: 4px; padding: 12px 8px 4px; }
.cf-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.cf-title { margin: 0; font: 400 28px/30px var(--font-display); }
.cf-body { padding: 8px 16px; display: flex; flex-direction: column; gap: 16px; }
.cf-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.cf-label { font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.cf-cap { margin: 0; font-size: 12px; line-height: 16px; color: var(--ink-soft); }
.cf-strong { font: 600 15px/22px var(--font-sans); }
.cf-col { display: flex; flex-direction: column; gap: 2px; }
.cf-input { box-sizing: border-box; width: 100%; height: var(--field-height); border: 0; border-radius: var(--radius-sm); background: var(--surface); padding: 0 14px; font: 400 16px/22px var(--font-sans); color: var(--ink); }
.cf-input::placeholder { color: var(--ink-soft); }
.cf-input:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--primary); }
.cf-mono { font-family: var(--font-mono); font-size: 15px; }
.cf-folds { display: flex; flex-direction: column; }
.cf-fold { border-top: 1px solid var(--line); }
.cf-fold:last-child { border-bottom: 1px solid var(--line); }
.cf-fold-h { width: 100%; min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: left; }
.cf-fold-b { display: flex; flex-direction: column; gap: 12px; padding-bottom: 16px; }
.cf-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.cf-rot { transform: rotate(180deg); }
.cf-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.cf-chip { height: var(--chip-height); padding: 0 14px; border-radius: 99px; background: var(--surface); color: var(--ink); font: 400 14px/1 var(--font-sans); }
.cf-chip[aria-pressed='true'] { background: var(--primary); color: var(--on-primary); }
.cf-chip-add { background: transparent; border: 1px dashed var(--ink-faint); color: var(--ink-soft); }
.cf-chip-in { width: 140px; border: 0; outline: 2px solid var(--primary); }
.cf-seg { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 4px; border-radius: 12px; background: var(--surface); }
.cf-seg button { height: 40px; border-radius: 9px; font: 500 14px/1 var(--font-sans); color: var(--ink-soft); }
.cf-seg button[aria-pressed='true'] { background: var(--bg); color: var(--ink); font-weight: 600; }
.cf-notes { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.cf-notes-h { display: flex; align-items: center; justify-content: space-between; }
.cf-link { min-height: var(--touch-min); font: 500 14px/1 var(--font-sans); color: var(--primary-pressed); }
.cf-delete { align-self: flex-start; min-height: var(--touch-min); font: 500 14px/1 var(--font-sans); color: var(--danger); }
.cf-foot { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; padding: 12px 16px calc(16px + env(safe-area-inset-bottom)); background: var(--bg); border-top: 1px solid var(--line); max-width: 640px; margin: 0 auto; }
.cf-save { width: 100%; height: var(--button-height); border-radius: var(--radius-md); background: var(--primary); color: var(--on-primary); font: 600 16px/20px var(--font-sans); }
.cf-save:disabled { background: var(--surface-strong); color: var(--ink-soft); }
button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media (min-width: 1024px) { .cf-foot { left: 260px; } }
</style>

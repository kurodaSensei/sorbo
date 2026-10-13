<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Timestamp } from 'firebase/firestore'
import type { BrewMethod, Coffee, CoffeeInput, Recipe, Tasting, TastingInput, WishlistItem } from '~/types'
import type { NotePrefill } from '~/stores/ui'
import { SCORE_WORDS, scoreToRating } from '~/utils/score'
import { fmtSeconds } from '~/utils/dates'

// Nota rápida v2 (design/v2/prototipo, «Nueva nota»): café, puntaje,
// sabores y nota en una sola pantalla. El café no es un paso previo: si el
// nombre no existe en Mis cafés, se crea al guardar.

const props = defineProps<{
  /** Precarga el café (Repetir, «Cata este café», cierre del Vertido). */
  initialCoffeeId?: string | null
  /** Café de Quiero probar o datos del temporizador. */
  prefill?: NotePrefill | null
}>()

const emit = defineEmits<{
  cancel: []
  saved: [id: string]
}>()

const coffeesStore = useCoffeesStore()
const tastingsStore = useTastingsStore()
const recipesStore = useRecipesStore()
const wishlistStore = useWishlistStore()
const friendsStore = useFriendsStore()
const { createCoffee } = useCoffees()
const { updateItem: updateWishlistItem } = useWishlist()
const { brewMethodOptions, flavorNoteOptions, getBrewMethodLabel } = useCatalog()
const { currentUser } = useAuth()
const { trackEvent } = useAnalytics()
const toast = useToast()

onMounted(() => {
  if (!coffeesStore.list.length) coffeesStore.loadAll().catch(() => {})
  if (!tastingsStore.list.length) tastingsStore.loadAll().catch(() => {})
  if (!recipesStore.list.length) recipesStore.loadAll().catch(() => {})
  if (!wishlistStore.list.length) wishlistStore.loadAll().catch(() => {})
})

const norm = (s?: string | null) => (s || '').trim().toLowerCase()
const coffees = computed(() => coffeesStore.list as Coffee[])
const tastings = computed(() => tastingsStore.list as Tasting[])
const recipes = computed(() => recipesStore.list as Recipe[])

// ─── Café ────────────────────────────────────────────────────────────────────
const name = ref('')
const brand = ref('')
const focused = ref(false)

const match = computed(() => coffees.value.find(c => norm(c.name) === norm(name.value)) ?? null)
const wish = computed(() => match.value
  ? null
  : (wishlistStore.list as WishlistItem[]).find(w => w.status === 'pending' && norm(w.coffeeName) === norm(name.value)) ?? null)
const lastNote = computed(() => match.value ? tastings.value.find(t => t.coffeeId === match.value!.id) ?? null : null)

const recents = computed(() => {
  const ids = [...new Set(tastings.value.map(t => t.coffeeId))]
  const fromNotes = ids.map(id => coffees.value.find(c => c.id === id)).filter(Boolean) as Coffee[]
  const list = fromNotes.length ? fromNotes : coffees.value
  return list.slice(0, 4)
})

const suggestions = computed(() => {
  const q = norm(name.value)
  if (!focused.value || !q || match.value) return []
  const mine = coffees.value.map(c => ({ key: c.id, name: c.name, brand: c.roasterName || '', hint: c.roasterName || 'Mis cafés' }))
  const wished = (wishlistStore.list as WishlistItem[]).filter(w => w.status === 'pending')
    .map(w => ({ key: w.id, name: w.coffeeName, brand: w.roasterName || '', hint: 'Quiero probar' }))
  return [...mine, ...wished].filter(x => norm(x.name).includes(q) && norm(x.name) !== q).slice(0, 3)
})

// El blur se retrasa para que un toque en una sugerencia alcance a registrarse.
function onCafeBlur() {
  setTimeout(() => { focused.value = false }, 150)
}

function pick(c: { name: string, brand: string }) {
  name.value = c.name
  brand.value = c.brand
  focused.value = false
}

const helper = computed(() => {
  if (match.value) return `${match.value.roasterName ? `${match.value.roasterName} · ` : ''}de tu colección`
  if (wish.value) return 'De tu lista Quiero probar · sale de la lista al guardar'
  if (norm(name.value)) return 'Café nuevo · se añade a Mis cafés al guardar'
  return 'Escribe el nombre o elige uno reciente'
})

// ─── Puntaje, sabores, nota ─────────────────────────────────────────────────
const score = ref(0)
const flavors = ref<string[]>([])
const extraFlavors = ref<string[]>([])
const addingFlavor = ref(false)
const newFlavor = ref('')
const text = ref('')

const flavorChips = computed(() => [...flavorNoteOptions.value.slice(0, 6), ...extraFlavors.value])

function toggleFlavor(f: string) {
  flavors.value = flavors.value.includes(f) ? flavors.value.filter(x => x !== f) : [...flavors.value, f]
}

function addFlavor() {
  const f = newFlavor.value.trim()
  if (f && !flavorChips.value.includes(f)) extraFlavors.value.push(f)
  if (f && !flavors.value.includes(f)) flavors.value.push(f)
  newFlavor.value = ''
  addingFlavor.value = false
}

// ─── Más detalles ───────────────────────────────────────────────────────────
const moreOpen = ref(false)
const method = ref<BrewMethod | ''>('')
const dose = ref('')
const water = ref('')
const time = ref('')
const fromLast = ref(false)
const recipeName = ref('')

function parseTime(v: string): number | undefined {
  const m = v.trim().match(/^(\d+)(?::(\d{1,2}))?$/)
  if (!m) return undefined
  return m[2] !== undefined ? Number(m[1]) * 60 + Number(m[2]) : Number(m[1]) * 60
}

// Al elegir un café con notas previas, «Más detalles» se llena como la última vez.
// Si la nota llega desde el temporizador, sus datos mandan sobre «la última vez».
const keepDetails = ref(false)

watch(() => match.value?.id, () => {
  if (keepDetails.value) return
  const t = lastNote.value
  if (!t) { fromLast.value = false; return }
  method.value = t.brewMethod
  dose.value = t.dose ? String(t.dose) : ''
  water.value = t.water ? String(t.water) : ''
  time.value = fmtSeconds(t.brewTime)
  fromLast.value = true
})

function useRecipe(r: Recipe) {
  recipeName.value = r.name
  method.value = r.brewMethod
  dose.value = String(r.dose)
  water.value = String(r.water)
  const total = r.steps?.length ? Math.max(...r.steps.map(s => s.timeSeconds)) : 0
  time.value = fmtSeconds(total)
  fromLast.value = false
}

const ratio = computed(() => {
  const d = Number(dose.value)
  const w = Number(water.value)
  return d > 0 && w > 0 ? `1:${(w / d).toFixed(1)}` : '—'
})

const moreSummary = computed(() => {
  const parts = [method.value && getBrewMethodLabel(method.value), dose.value && `${dose.value} g`].filter(Boolean)
  if (!parts.length) return 'Método, receta y dosis'
  return parts.join(' · ') + (fromLast.value ? ' · como la última vez' : '')
})

// ─── Compartir ──────────────────────────────────────────────────────────────
const SHARE_KEY = 'sorbo:share-with-friends'
const share = ref(true)
onMounted(() => {
  try { share.value = localStorage.getItem(SHARE_KEY) !== '0' }
  catch { /* almacenamiento bloqueado: se queda en sí */ }
  if (!friendsStore.list.length) friendsStore.load().catch(() => {})
})
watch(share, (v) => {
  try { localStorage.setItem(SHARE_KEY, v ? '1' : '0') }
  catch { /* ignorar */ }
})

// ─── Precarga ───────────────────────────────────────────────────────────────
watch(
  () => [props.initialCoffeeId, coffees.value.length] as const,
  ([id]) => {
    if (!id || name.value) return
    const c = coffees.value.find(x => x.id === id)
    if (c) pick({ name: c.name, brand: c.roasterName || '' })
  },
  { immediate: true },
)

// Precarga desde Quiero probar («Anotar») o desde el temporizador.
onMounted(() => {
  const p = props.prefill
  if (!p) return
  if (p.name) pick({ name: p.name, brand: p.brand || '' })
  if (p.method || p.dose || p.water || p.time) {
    method.value = (p.method || '') as BrewMethod | ''
    dose.value = p.dose ? String(p.dose) : ''
    water.value = p.water ? String(p.water) : ''
    time.value = fmtSeconds(p.time)
    recipeName.value = p.recipeName || ''
    fromLast.value = false
    moreOpen.value = true
    keepDetails.value = true
  }
})

// ─── Guardar ────────────────────────────────────────────────────────────────
const saving = ref(false)
const canSave = computed(() => !!norm(name.value) && score.value > 0 && !saving.value)
const saveHint = computed(() => !norm(name.value) ? 'Escribe el café y elige un puntaje' : 'Elige un puntaje para guardar')

async function save() {
  if (!canSave.value) return
  saving.value = true
  // Se fijan antes de crear el café: al añadirlo, `match` lo encuentra y
  // `wish` deja de apuntar al elemento de Quiero probar.
  const isNewCoffee = !match.value
  const wishItem = wish.value
  try {
    let coffee = match.value
    if (!coffee) {
      const payload: CoffeeInput = {
        name: name.value.trim(),
        roasterName: brand.value.trim() || wishItem?.roasterName || undefined,
        roasterId: wishItem?.roasterId || undefined,
        variety: wishItem?.variety || '',
        process: 'other',
        originRegion: '',
        originCountry: '',
        flavorNotes: [],
      }
      const id = await createCoffee(payload)
      coffee = { id, ...payload, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as Coffee
      coffeesStore.upsertLocal(coffee)
    }

    const friendUids = friendsStore.friendUids as string[]
    const author = currentUser.value?.displayName || currentUser.value?.email?.split('@')[0] || undefined
    const brewTime = parseTime(time.value)
    const tasting: TastingInput = {
      coffeeId: coffee.id,
      coffeeName: coffee.name,
      roasterName: coffee.roasterName || '',
      brewMethod: (method.value || 'other') as BrewMethod,
      brewDate: Timestamp.now(),
      dose: Number(dose.value) || undefined,
      water: Number(water.value) || undefined,
      ratio: ratio.value !== '—' ? ratio.value : undefined,
      brewTime,
      recipeName: recipeName.value || undefined,
      ratingOverall: scoreToRating(score.value),
      flavorNotes: flavors.value,
      personalNotes: text.value.trim() || undefined,
      visibility: share.value && friendUids.length ? 'friends' : 'private',
      sharedWith: share.value ? friendUids : [],
      authorName: share.value ? author : undefined,
      authorPhotoURL: share.value ? currentUser.value?.photoURL || undefined : undefined,
    }
    const id = await tastingsStore.create(tasting)

    // Sale de «Quiero probar» sin un segundo aviso: el toast de la nota basta.
    if (wishItem) {
      await updateWishlistItem(wishItem.id, { status: 'purchased' })
        .then(() => wishlistStore.upsertLocal({ ...wishItem, status: 'purchased' }))
        .catch(() => {})
    }
    trackEvent('note_saved', {
      new_coffee: isNewCoffee,
      from_wishlist: !!wishItem,
      score: score.value,
      flavors: flavors.value.length,
      has_text: !!text.value.trim(),
      has_details: !!(method.value || dose.value),
      shared: share.value,
    })
    emit('saved', id as string)
  }
  catch (e) {
    toast.error('No se pudo guardar la nota', e)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="note-form">
    <header class="nf-head">
      <button type="button" class="nf-cancel" @click="emit('cancel')">Cancelar</button>
      <h1 class="nf-title">Nueva nota</h1>
      <span class="nf-cancel" aria-hidden="true" />
    </header>

    <div class="nf-body">
      <div class="nf-field nf-rel">
        <label for="nf-cafe" class="nf-label">Café</label>
        <input
          id="nf-cafe"
          v-model="name"
          class="nf-input nf-strong"
          autocomplete="off"
          placeholder="Busca o escribe un café"
          @focus="focused = true"
          @blur="onCafeBlur"
        >
        <div v-if="suggestions.length" class="nf-sugg" role="listbox" aria-label="Sugerencias">
          <button v-for="s in suggestions" :key="s.key" type="button" role="option" @mousedown.prevent="pick(s)">
            <span>{{ s.name }}</span><span class="nf-caption">{{ s.hint }}</span>
          </button>
        </div>
        <span class="nf-caption">{{ helper }}</span>
      </div>

      <div v-if="norm(name) && !match && !wish" class="nf-field">
        <label for="nf-marca" class="nf-label">Marca <span class="nf-opt">(opcional)</span></label>
        <input id="nf-marca" v-model="brand" class="nf-input" placeholder="Quién lo tuesta">
      </div>

      <div v-if="recents.length && !initialCoffeeId" class="nf-recents">
        <span class="nf-caption">Recientes</span>
        <button
          v-for="c in recents"
          :key="c.id"
          type="button"
          class="nf-chip nf-chip-sm"
          :aria-pressed="match?.id === c.id"
          @click="pick({ name: c.name, brand: c.roasterName || '' })"
        >
          {{ c.name }}
        </button>
      </div>

      <fieldset class="nf-score">
        <legend class="nf-label">¿Qué tal estuvo?</legend>
        <div>
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            :aria-pressed="score === n"
            @click="score = n"
          >
            <span class="nf-num">{{ n }}</span>
            <span class="nf-word">{{ SCORE_WORDS[n] }}</span>
          </button>
        </div>
      </fieldset>

      <div class="nf-field">
        <span class="nf-label">Sabores</span>
        <div class="nf-wrap">
          <button
            v-for="f in flavorChips"
            :key="f"
            type="button"
            class="nf-chip"
            :aria-pressed="flavors.includes(f)"
            @click="toggleFlavor(f)"
          >
            {{ f }}
          </button>
          <input
            v-if="addingFlavor"
            v-model="newFlavor"
            class="nf-chip nf-chip-input"
            aria-label="Nuevo sabor"
            placeholder="Sabor"
            autofocus
            @keydown.enter.prevent="addFlavor"
            @blur="addFlavor"
          >
          <button v-else type="button" class="nf-chip nf-chip-add" @click="addingFlavor = true">+ Otro</button>
        </div>
      </div>

      <div class="nf-field">
        <label for="nf-nota" class="nf-label">Nota <span class="nf-opt">(opcional)</span></label>
        <textarea id="nf-nota" v-model="text" rows="2" class="nf-input nf-area" placeholder="Lo que se te quedó de esta taza…" />
      </div>

      <section class="nf-more">
        <button type="button" class="nf-more-h" :aria-expanded="moreOpen" @click="moreOpen = !moreOpen">
          <span class="nf-col">
            <span class="nf-more-t">Más detalles</span>
            <span v-if="!moreOpen" class="nf-caption">{{ moreSummary }}</span>
          </span>
          <AppIcon name="down" :size="20" :stroke="2" :class="{ 'nf-rot': moreOpen }" />
        </button>
        <div v-if="moreOpen" class="nf-more-b">
          <template v-if="recipes.length">
            <span class="nf-label">Usar una receta</span>
            <div class="nf-hwrap">
              <button
                v-for="r in recipes"
                :key="r.id"
                type="button"
                class="nf-chip nf-chip-sm"
                @click="useRecipe(r)"
              >
                {{ r.name }}
              </button>
            </div>
          </template>
          <span class="nf-label">Método</span>
          <div class="nf-wrap">
            <button
              v-for="m in brewMethodOptions"
              :key="m.value"
              type="button"
              class="nf-chip"
              :aria-pressed="method === m.value"
              @click="method = method === m.value ? '' : (m.value as BrewMethod); fromLast = false; recipeName = ''"
            >
              {{ m.label }}
            </button>
          </div>
          <div class="nf-grid">
            <div class="nf-field"><label for="nf-dosis" class="nf-label">Dosis (g)</label><input id="nf-dosis" v-model="dose" class="nf-input nf-mono" inputmode="decimal"></div>
            <div class="nf-field"><label for="nf-agua" class="nf-label">Agua (ml)</label><input id="nf-agua" v-model="water" class="nf-input nf-mono" inputmode="decimal"></div>
            <div class="nf-field"><label for="nf-tiempo" class="nf-label">Tiempo</label><input id="nf-tiempo" v-model="time" class="nf-input nf-mono" placeholder="3:00"></div>
          </div>
          <span class="nf-caption">Ratio <span class="nf-mono nf-ink">{{ ratio }}</span></span>
        </div>
      </section>
    </div>

    <footer class="nf-foot">
      <div class="nf-share">
        <span id="nf-share-l" class="nf-share-t"><AppIcon name="users" :size="18" />Compartir con amigos</span>
        <button
          type="button"
          role="switch"
          class="nf-switch"
          :aria-checked="share"
          aria-labelledby="nf-share-l"
          @click="share = !share"
        >
          <span />
        </button>
      </div>
      <button type="button" class="nf-save" :disabled="!canSave" :aria-busy="saving || undefined" @click="save">
        {{ saving ? 'Guardando…' : 'Guardar nota' }}
      </button>
      <span v-if="!canSave && !saving" class="nf-caption nf-center">{{ saveHint }}</span>
    </footer>
  </div>
</template>

<style scoped>
.note-form { height: 100%; display: flex; flex-direction: column; background: var(--bg); color: var(--ink); font-family: var(--font-sans); }
.nf-head { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; flex-shrink: 0; }
.nf-cancel { min-width: 84px; min-height: var(--touch-min); padding: 0 8px; text-align: left; font-size: 15px; color: var(--ink-soft); }
.nf-title { font: 600 16px/20px var(--font-sans); margin: 0; }
.nf-body { flex: 1; overflow-y: auto; padding: 8px 16px 20px; display: flex; flex-direction: column; gap: 22px; }
.nf-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.nf-rel { position: relative; }
.nf-label { font: 600 13px/16px var(--font-sans); color: var(--ink-soft); padding: 0; }
.nf-opt { font-weight: 400; }
.nf-caption { font: 400 12px/16px var(--font-sans); color: var(--ink-soft); }
.nf-center { text-align: center; }
.nf-input { box-sizing: border-box; width: 100%; height: var(--field-height); border: 0; border-radius: var(--radius-sm); background: var(--surface); padding: 0 14px; font: 400 16px/22px var(--font-sans); color: var(--ink); }
.nf-input::placeholder { color: var(--ink-soft); }
.nf-input:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--primary); }
.nf-strong { font-weight: 500; }
.nf-area { height: auto; padding: 12px 14px; resize: none; }
.nf-mono { font-family: var(--font-mono); font-size: 15px; }
.nf-ink { color: var(--ink); }
.nf-sugg { position: absolute; left: 0; right: 0; top: 78px; z-index: 3; background: var(--bg); border-radius: var(--radius-sm); box-shadow: 0 8px 24px rgba(20, 23, 18, 0.16); overflow: hidden; }
.nf-sugg button { display: flex; width: 100%; justify-content: space-between; align-items: center; gap: 8px; min-height: var(--touch-min); padding: 0 14px; font-size: 15px; text-align: left; }
.nf-sugg button + button { border-top: 1px solid var(--line); }
.nf-recents, .nf-hwrap { display: flex; align-items: center; gap: 8px; overflow-x: auto; margin-top: -10px; scrollbar-width: none; }
.nf-hwrap { margin-top: 0; }
.nf-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
.nf-chip { height: var(--chip-height); padding: 0 14px; border-radius: 99px; background: var(--surface); color: var(--ink); font: 400 14px/1 var(--font-sans); flex-shrink: 0; white-space: nowrap; }
.nf-chip-sm { height: 32px; padding: 0 12px; font-size: 13px; }
.nf-chip[aria-pressed='true'] { background: var(--primary); color: var(--on-primary); }
.nf-chip-add { background: transparent; border: 1px dashed var(--ink-faint); color: var(--ink-soft); }
.nf-chip-input { width: 120px; border: 0; outline: 2px solid var(--primary); }
.nf-score { border: 0; margin: 0; padding: 0; }
.nf-score legend { margin-bottom: 10px; }
.nf-score > div { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.nf-score button { height: 64px; border-radius: var(--radius-md); background: var(--surface); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; transition: background 200ms; }
.nf-num { font: 400 22px/1 var(--font-display); }
.nf-word { font-size: 11px; color: var(--ink-soft); }
.nf-score button[aria-pressed='true'] { background: var(--action-bg); }
.nf-score button[aria-pressed='true'] .nf-num { color: var(--action-fg); }
.nf-score button[aria-pressed='true'] .nf-word { color: var(--on-action); }
.nf-more { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.nf-more-h { width: 100%; min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: left; }
.nf-col { display: flex; flex-direction: column; gap: 2px; }
.nf-more-t { font: 600 15px/22px var(--font-sans); }
.nf-rot { transform: rotate(180deg); }
.nf-more-b { display: flex; flex-direction: column; gap: 12px; padding-bottom: 16px; }
.nf-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.nf-foot { flex-shrink: 0; padding: 12px 16px calc(16px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--line); background: var(--bg); }
.nf-share { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.nf-share-t { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.nf-switch { width: 50px; height: 30px; border-radius: 99px; position: relative; background: var(--surface-strong); flex-shrink: 0; transition: background 200ms; }
.nf-switch span { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 99px; background: var(--bg); transition: transform 200ms; }
.nf-switch[aria-checked='true'] { background: var(--primary); }
.nf-switch[aria-checked='true'] span { transform: translateX(20px); background: var(--on-primary); }
.nf-save { height: var(--button-height); border-radius: var(--radius-md); background: var(--primary); color: var(--on-primary); font: 600 16px/20px var(--font-sans); }
.nf-save:disabled { background: var(--surface-strong); color: var(--ink-soft); }
button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>

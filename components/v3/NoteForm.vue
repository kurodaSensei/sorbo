<script setup lang="ts">
// Nota rápida v3 (como la de v2): café, puntaje 1–5, sabores y nota en una sola
// pantalla; método, receta, dosis y atributos van en «Más detalles».
// Si el café no existe en tu colección, se crea al guardar.
import { Timestamp, deleteField } from 'firebase/firestore'
import type { BrewMethod, Coffee, CoffeeInput, Recipe, Tasting, TastingInput, WishlistItem } from '~/types'

const props = defineProps<{
  /** Precarga el café («Cata este café», «Repetir esta cata»). */
  initialCoffeeId?: string | null
  /** Modo edición: la cata a editar. */
  tasting?: Tasting | null
  /** Desde «Quiero probar»: precarga ese café y lo marca como conseguido al guardar. */
  wishId?: string | null
}>()

const router = useRouter()
const coffeesStore = useCoffeesStore()
const tastingsStore = useTastingsStore()
const recipesStore = useRecipesStore()
const friendsStore = useFriendsStore()
const wishlistStore = useWishlistStore()
const { updateItem: updateWishlistItem } = useWishlist()
const { brewMethodOptions, flavorNoteOptions, getBrewMethodLabel } = useCatalog()
const { currentUser } = useAuth()
const { trackEvent } = useAnalytics()
const { confirm } = useConfirm()
const isDesktop = useMediaQuery('(min-width: 1024px)')

const original = props.tasting ?? null
const isEdit = !!original

onMounted(() => {
  if (!coffeesStore.list.length) coffeesStore.loadAll().catch(() => {})
  if (!tastingsStore.list.length) tastingsStore.loadAll().catch(() => {})
  if (!recipesStore.list.length) recipesStore.loadAll().catch(() => {})
  if (!friendsStore.list.length) friendsStore.load().catch(() => {})
  if (props.wishId && !wishlistStore.list.length) wishlistStore.loadAll().catch(() => {})
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
const lastNote = computed(() => {
  if (!match.value) return null
  return tastings.value
    .filter(t => t.coffeeId === match.value!.id && t.id !== original?.id)
    .sort((a, b) => (b.brewDate?.toMillis?.() ?? 0) - (a.brewDate?.toMillis?.() ?? 0))[0] ?? null
})
const recents = computed(() => {
  const ids = [...new Set(tastings.value.map(t => t.coffeeId))]
  const fromNotes = ids.map(id => coffees.value.find(c => c.id === id)).filter(Boolean) as Coffee[]
  return (fromNotes.length ? fromNotes : coffees.value).slice(0, 4)
})
const suggestions = computed(() => {
  const q = norm(name.value)
  if (!focused.value || !q || match.value) return []
  return coffees.value.filter(c => norm(c.name).includes(q)).slice(0, 4)
})
function onCoffeeBlur() {
  // El retraso deja que el toque en una sugerencia se registre.
  setTimeout(() => { focused.value = false }, 150)
}
function pick(c: { name: string, roasterName?: string }) {
  name.value = c.name
  brand.value = c.roasterName || ''
  focused.value = false
}
const coffeeHelp = computed(() => {
  if (match.value) return `De tu colección${match.value.roasterName ? ` · ${match.value.roasterName}` : ''}.`
  if (wish.value && norm(wish.value.coffeeName) === norm(name.value)) return 'De Quiero probar: al guardar sale de la lista y entra a tu colección.'
  if (norm(name.value)) return 'Café nuevo: lo agregamos a tu colección al guardar.'
  return 'Escribe el nombre o elige uno reciente.'
})

// ─── Puntaje, sabores, nota ─────────────────────────────────────────────────
const score = ref(0)
const flavors = ref<string[]>([])
const extraFlavors = ref<string[]>([])
const addingFlavor = ref(false)
const newFlavor = ref('')
const text = ref('')
const isFavorite = ref(false)
const wouldBuyAgain = ref(false)

const flavorChips = computed(() => [...new Set([...flavorNoteOptions.value.slice(0, 8), ...extraFlavors.value])])
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
const recipeName = ref('')
const fromLast = ref(false)

const ATTRS = [
  { key: 'ratingAroma', label: 'Aroma' },
  { key: 'ratingAcidity', label: 'Acidez' },
  { key: 'ratingSweetness', label: 'Dulzura' },
  { key: 'ratingBody', label: 'Cuerpo' },
  { key: 'ratingAftertaste', label: 'Retrogusto' },
] as const
type AttrKey = typeof ATTRS[number]['key']
const attrs = ref<Record<AttrKey, number>>({ ratingAroma: 0, ratingAcidity: 0, ratingSweetness: 0, ratingBody: 0, ratingAftertaste: 0 })
function setAttr(k: AttrKey, n: number) {
  attrs.value[k] = attrs.value[k] === n ? 0 : n
}

const clock = (s?: number) => (s ? formatClock(s) : '')
const ratio = computed(() => {
  const d = Number(dose.value)
  const w = Number(water.value)
  return d > 0 && w > 0 ? `1:${Math.round(w / d)}` : ''
})
const moreSummary = computed(() => {
  const parts = [method.value && getBrewMethodLabel(method.value), dose.value && `${dose.value} g`].filter(Boolean)
  if (!parts.length) return 'Método, receta, dosis y atributos'
  return parts.join(' · ') + (fromLast.value ? ' · como la última vez' : '')
})

// Al elegir un café ya catado, los detalles se llenan como la última vez.
const keepDetails = ref(isEdit)
watch(() => [match.value?.id, lastNote.value?.id] as const, ([id], old) => {
  if (keepDetails.value) return
  const t = lastNote.value
  if (!t) { fromLast.value = false; return }
  if (id === old?.[0] && (method.value || dose.value)) return
  method.value = t.brewMethod && t.brewMethod !== 'other' ? t.brewMethod : ''
  dose.value = t.dose ? String(t.dose) : ''
  water.value = t.water ? String(t.water) : ''
  time.value = clock(t.brewTime)
  recipeName.value = t.recipeName || ''
  fromLast.value = true
  for (const f of t.flavorNotes ?? []) if (!flavorChips.value.includes(f)) extraFlavors.value.push(f)
})

function useRecipe(r: Recipe) {
  if (recipeName.value === r.name) { recipeName.value = ''; return }
  recipeName.value = r.name
  method.value = r.brewMethod
  dose.value = String(r.dose || '')
  water.value = String(r.water || '')
  time.value = clock(r.steps?.length ? Math.max(...r.steps.map(s => s.timeSeconds)) : 0)
  fromLast.value = false
}

// ─── Compartir ──────────────────────────────────────────────────────────────
// ponytail: preferencia por dispositivo en localStorage; arranca apagada (v1 guardaba todo privado).
const SHARE_KEY = 'sorbo:share-with-friends'
const share = useLocalStorage(SHARE_KEY, false)

// ─── Precarga ───────────────────────────────────────────────────────────────
const wish = computed(() => (props.wishId ? (wishlistStore.list as WishlistItem[]).find(w => w.id === props.wishId) ?? null : null))
watch(wish, (w) => {
  if (w && !name.value) pick({ name: w.coffeeName, roasterName: w.roasterName })
}, { immediate: true })

watch(() => [props.initialCoffeeId, coffees.value.length] as const, ([id]) => {
  if (!id || name.value) return
  const c = coffees.value.find(x => x.id === id)
  if (c) pick(c)
}, { immediate: true })

if (original) {
  name.value = original.coffeeName || ''
  brand.value = original.roasterName || ''
  score.value = ratingToScore(original.ratingOverall)
  flavors.value = [...(original.flavorNotes ?? [])]
  extraFlavors.value = [...flavors.value]
  text.value = original.personalNotes || ''
  isFavorite.value = !!original.isFavorite
  wouldBuyAgain.value = !!original.wouldBuyAgain
  method.value = original.brewMethod && original.brewMethod !== 'other' ? original.brewMethod : ''
  dose.value = original.dose ? String(original.dose) : ''
  water.value = original.water ? String(original.water) : ''
  time.value = clock(original.brewTime)
  recipeName.value = original.recipeName || ''
  for (const a of ATTRS) attrs.value[a.key] = ratingToScore(original[a.key])
  moreOpen.value = !!(method.value || dose.value || water.value || time.value || ATTRS.some(a => attrs.value[a.key]))
}
const originalAttrs = { ...attrs.value }

// ─── Guardar ────────────────────────────────────────────────────────────────
const saving = ref(false)
const tried = ref(false)
const missing = computed(() => (!norm(name.value) ? 'Escribe el café.' : !score.value ? 'Elige qué tal estuvo.' : ''))

async function save() {
  tried.value = true
  if (missing.value || saving.value) return
  saving.value = true
  try {
    let coffee = match.value
    if (!coffee) {
      const payload: CoffeeInput = {
        name: name.value.trim(),
        roasterName: brand.value.trim() || undefined,
        variety: '',
        process: 'other',
        originRegion: '',
        originCountry: '',
        flavorNotes: [],
      }
      const id = await coffeesStore.create(payload)
      coffee = (coffeesStore.list as Coffee[]).find(c => c.id === id) ?? ({ id, ...payload } as Coffee)
    }
    const brewTime = parseClock(time.value) || undefined

    if (original) {
      // Solo lo que el formulario edita; visibilidad, fecha y autor se conservan.
      const del = deleteField()
      const patch: Record<string, unknown> = {
        coffeeId: coffee.id,
        coffeeName: coffee.name,
        roasterName: coffee.roasterName || '',
        brewMethod: (method.value || 'other') as BrewMethod,
        dose: Number(dose.value) || del,
        water: Number(water.value) || del,
        ratio: ratio.value || del,
        brewTime: brewTime ?? del,
        recipeName: recipeName.value || del,
        flavorNotes: flavors.value,
        personalNotes: text.value.trim() || del,
        isFavorite: isFavorite.value || del,
        wouldBuyAgain: wouldBuyAgain.value || del,
      }
      // Un puntaje de v1 (p. ej. 7) se conserva si no lo tocaste.
      if (score.value !== ratingToScore(original.ratingOverall)) patch.ratingOverall = scoreToRating(score.value)
      for (const a of ATTRS) {
        if (attrs.value[a.key] !== originalAttrs[a.key]) patch[a.key] = attrs.value[a.key] ? scoreToRating(attrs.value[a.key]) : del
      }
      await tastingsStore.update(original.id, patch as Partial<Tasting>)
      router.replace(`/app/tastings/${original.id}`)
      return
    }

    const friendUids = friendsStore.friendUids as string[]
    const shared = share.value && friendUids.length > 0
    const author = currentUser.value?.displayName || currentUser.value?.email?.split('@')[0] || undefined
    const input: TastingInput = {
      coffeeId: coffee.id,
      coffeeName: coffee.name,
      roasterName: coffee.roasterName || '',
      brewMethod: (method.value || 'other') as BrewMethod,
      brewDate: Timestamp.now(),
      dose: Number(dose.value) || undefined,
      water: Number(water.value) || undefined,
      ratio: ratio.value || undefined,
      brewTime,
      recipeName: recipeName.value || undefined,
      ratingOverall: scoreToRating(score.value),
      flavorNotes: flavors.value,
      personalNotes: text.value.trim() || undefined,
      isFavorite: isFavorite.value || undefined,
      wouldBuyAgain: wouldBuyAgain.value || undefined,
      visibility: shared ? 'friends' : 'private',
      sharedWith: shared ? friendUids : [],
      authorName: shared ? author : undefined,
      authorPhotoURL: shared ? currentUser.value?.photoURL || undefined : undefined,
    }
    for (const a of ATTRS) if (attrs.value[a.key]) input[a.key] = scoreToRating(attrs.value[a.key])
    // Firestore no acepta undefined: se quitan los campos vacíos.
    const clean = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as TastingInput
    const id = await tastingsStore.create(clean)
    // Si vino de «Quiero probar», sale de la lista sin un segundo aviso.
    if (wish.value) await updateWishlistItem(wish.value.id, { status: 'purchased' }).catch(() => {})
    trackEvent('tasting_created', {
      quick_note: true,
      score: score.value,
      flavors: flavors.value.length,
      has_text: !!text.value.trim(),
      has_details: !!(method.value || dose.value),
      new_coffee: !match.value,
      shared,
    })
    router.replace(`/app/tastings/${id}`)
  }
  catch {
    // El store ya muestra el aviso.
  }
  finally {
    saving.value = false
  }
}

const dirty = computed(() => !isEdit && !!(norm(name.value) || score.value || flavors.value.length || text.value.trim()))
async function close() {
  if (dirty.value) {
    const ok = await confirm({ title: '¿Salir sin guardar?', message: 'Se perderá lo que anotaste.', confirmLabel: 'Salir', cancelLabel: 'Seguir aquí' })
    if (!ok) return
  }
  if (original) router.push(`/app/tastings/${original.id}`)
  else router.back()
}
</script>

<template>
  <div class="v3 note">
    <header class="head">
      <h1 class="title">{{ isEdit ? 'Editar' : 'Nueva' }} <span class="v3-accent-word">nota</span></h1>
      <p class="v3-subtitle sub desktop-only">El café y qué tal estuvo. Lo demás, si quieres.</p>
      <button type="button" class="close mobile-only" aria-label="Cerrar" @click="close"><Icon name="lucide:x" size="22" /></button>
    </header>

    <div class="layout">
      <form class="form" novalidate @submit.prevent="save">
        <div class="field">
          <label for="note-coffee" class="v3-label">Café</label>
          <div class="search">
            <Icon name="lucide:search" size="18" class="search-icon" />
            <input
              id="note-coffee"
              v-model="name"
              class="v3-input search-input"
              :class="{ 'is-match': match, 'is-err': tried && !norm(name) }"
              placeholder="Busca o escribe un café"
              autocomplete="off"
              aria-describedby="note-coffee-help"
              @focus="focused = true"
              @blur="onCoffeeBlur"
            >
            <ul v-if="suggestions.length" class="suggest" role="listbox" aria-label="Cafés de tu colección">
              <li v-for="c in suggestions" :key="c.id">
                <button type="button" role="option" :aria-selected="false" class="suggest-item" @mousedown.prevent="pick(c)" @click="pick(c)">
                  <span class="suggest-name">{{ c.name }}</span><span v-if="c.roasterName" class="v3-meta">{{ c.roasterName }}</span>
                </button>
              </li>
            </ul>
          </div>
          <p id="note-coffee-help" class="v3-meta m0">{{ coffeeHelp }}</p>
          <V3Field v-if="norm(name) && !match" v-model="brand" label="Marca · opcional" placeholder="Tostador o tienda" />
          <div v-if="!isEdit && !initialCoffeeId && recents.length" class="chips" aria-label="Recientes">
            <span class="v3-meta chips-lab">Recientes</span>
            <button v-for="c in recents" :key="c.id" type="button" :class="['v3-chip', 'small', { 'v3-chip--on': match?.id === c.id }]" @click="pick(c)">{{ c.name }}</button>
          </div>
        </div>

        <fieldset class="score">
          <legend class="score-q">¿Qué tal <span class="v3-accent-word">estuvo</span>?</legend>
          <div class="score-grid">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              :class="['score-btn', { 'score-btn--on v3-pop': score === n }]"
              :aria-pressed="score === n"
              @click="score = n"
            >
              <span class="score-n">{{ n }}</span><span class="score-w">{{ SCORE_WORDS[n] }}</span>
            </button>
          </div>
        </fieldset>

        <div class="field">
          <span id="note-flavors" class="v3-label">Sabores <span class="opt">· opcional</span></span>
          <div class="chips" role="group" aria-labelledby="note-flavors">
            <button
              v-for="f in flavorChips"
              :key="f"
              type="button"
              :class="['v3-chip', { 'v3-chip--on': flavors.includes(f) }]"
              :aria-pressed="flavors.includes(f)"
              @click="toggleFlavor(f)"
            >
              {{ f }}
            </button>
            <button v-if="!addingFlavor" type="button" class="v3-chip v3-chip--add" @click="addingFlavor = true">+ Otro</button>
            <input
              v-else
              v-model="newFlavor"
              class="v3-input chip-input"
              placeholder="Sabor"
              aria-label="Otro sabor"
              autofocus
              @keydown.enter.prevent="addFlavor"
              @blur="addFlavor"
            >
          </div>
        </div>

        <div class="field">
          <label for="note-text" class="v3-label">Tu nota <span class="opt">· opcional</span></label>
          <textarea id="note-text" v-model="text" rows="3" class="v3-input textarea" placeholder="Dulce como postre, con un final a panela…" />
        </div>

        <div class="toggles">
          <button type="button" :class="['toggle', { 'toggle--fav v3-pop': isFavorite }]" :aria-pressed="isFavorite" @click="isFavorite = !isFavorite">
            <Icon name="lucide:heart" size="18" :class="{ 'fill-current': isFavorite }" />Favorita
          </button>
          <button type="button" :class="['toggle', { 'toggle--on v3-pop': wouldBuyAgain }]" :aria-pressed="wouldBuyAgain" @click="wouldBuyAgain = !wouldBuyAgain">
            <Icon name="lucide:rotate-ccw" size="18" />Repetiría
          </button>
        </div>

        <section class="more">
          <button type="button" class="more-head" :aria-expanded="moreOpen" aria-controls="note-more" @click="moreOpen = !moreOpen">
            <span class="more-text"><span class="more-title">Más detalles</span><span class="v3-meta">{{ moreSummary }}</span></span>
            <Icon name="lucide:chevron-down" size="18" :class="['more-chev', { 'more-chev--open': moreOpen }]" />
          </button>
          <div v-if="moreOpen" id="note-more" class="more-body v3-enter">
            <p v-if="fromLast" class="m0 v3-meta last">Lo llenamos como la última vez con este café.</p>
            <div class="field">
              <span id="note-method" class="v3-label">Método</span>
              <div class="chips" role="group" aria-labelledby="note-method">
                <button
                  v-for="m in brewMethodOptions"
                  :key="m.value"
                  type="button"
                  :class="['v3-chip', { 'v3-chip--on': method === m.value }]"
                  :aria-pressed="method === m.value"
                  @click="method = method === m.value ? '' : (m.value as BrewMethod)"
                >
                  {{ m.label }}
                </button>
              </div>
            </div>
            <div v-if="recipes.length" class="field">
              <span id="note-recipe" class="v3-label">Usar una receta</span>
              <div class="chips" role="group" aria-labelledby="note-recipe">
                <button
                  v-for="r in recipes.slice(0, 6)"
                  :key="r.id"
                  type="button"
                  :class="['v3-chip', { 'v3-chip--on': recipeName === r.name }]"
                  :aria-pressed="recipeName === r.name"
                  @click="useRecipe(r)"
                >
                  {{ r.name }}
                </button>
              </div>
            </div>
            <div class="nums">
              <label class="num"><span class="num-k">Dosis (g)</span><input v-model="dose" class="num-input" inputmode="decimal" placeholder="—"></label>
              <label class="num"><span class="num-k">Agua (ml)</span><input v-model="water" class="num-input" inputmode="numeric" placeholder="—"></label>
              <label class="num"><span class="num-k">Tiempo</span><input v-model="time" class="num-input" inputmode="numeric" placeholder="3:30"></label>
              <div class="num num--key" aria-live="polite"><span class="num-k">Ratio</span><span class="num-v">{{ ratio || '—' }}</span></div>
            </div>
            <div class="field">
              <span class="v3-label">Atributos <span class="opt">· opcionales, de 1 a 5</span></span>
              <div v-for="a in ATTRS" :key="a.key" class="attr">
                <span :id="`attr-${a.key}`" class="attr-k">{{ a.label }}</span>
                <span class="dots" role="radiogroup" :aria-labelledby="`attr-${a.key}`">
                  <button
                    v-for="n in 5"
                    :key="n"
                    type="button"
                    role="radio"
                    :aria-checked="attrs[a.key] === n"
                    :aria-label="`${n}`"
                    :class="['dot', { 'dot--on': n <= attrs[a.key] }]"
                    @click="setAttr(a.key, n)"
                  >
                    {{ n }}
                  </button>
                </span>
              </div>
            </div>
          </div>
        </section>
      </form>

      <aside class="side">
        <div class="preview desktop-only">
          <span class="v3-eyebrow preview-eb">— Así queda</span>
          <div class="preview-row">
            <V3TastingRow
              :rating="score ? scoreToRating(score) : 0"
              :name="name.trim() || 'Tu café'"
              :roaster="match?.roasterName || brand"
              :method="method ? getBrewMethodLabel(method) : ''"
              :note="text.trim()"
              :favorite="isFavorite"
            />
          </div>
        </div>
        <div class="foot">
          <label v-if="!isEdit" class="share">
            <span class="share-text">Compartir con amigos</span>
            <input v-model="share" type="checkbox" role="switch" class="share-input">
            <span class="switch" aria-hidden="true" />
          </label>
          <p v-if="tried && missing" class="v3-meta v3-error m0" role="alert">{{ missing }}</p>
          <button type="button" :class="['v3-btn', 'v3-btn--primary', 'save', { 'save--full': isEdit }]" :disabled="saving" :aria-busy="saving || undefined" @click="save">
            <span v-if="saving" class="v3-spinner" aria-hidden="true" />{{ isEdit ? 'Guardar cambios' : 'Guardar nota' }}
          </button>
          <button type="button" class="v3-btn cancel desktop-only" @click="close">Cancelar</button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.note { min-height: 100svh; box-sizing: border-box; padding: calc(env(safe-area-inset-top) + 16px) 20px 200px; display: flex; flex-direction: column; gap: 20px; }
.desktop-only { display: none !important; }
.m0 { margin: 0; }
.head { position: relative; display: flex; flex-direction: column; gap: 8px; padding-right: 48px; }
.title { margin: 0; font: 400 34px/36px var(--font-display); letter-spacing: -0.015em; }
.sub { margin: 0; }
.close { position: absolute; top: -6px; right: -10px; width: 44px; height: 44px; border: 0; border-radius: 12px; background: transparent; color: var(--ink-soft); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.layout { display: flex; flex-direction: column; gap: 20px; }
.form { display: flex; flex-direction: column; gap: 22px; min-width: 0; }
.field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.opt { font-weight: 400; }
.search { position: relative; }
.search-icon { position: absolute; left: 14px; top: 15px; color: var(--ink-soft); }
.search-input { padding-left: 42px; }
.search-input.is-match { box-shadow: inset 0 0 0 2px var(--primary); }
.search-input.is-err { box-shadow: inset 0 0 0 2px var(--danger); }
.suggest { position: absolute; z-index: 10; left: 0; right: 0; top: calc(100% + 6px); margin: 0; padding: 6px; list-style: none; border-radius: 14px; background: var(--bg); box-shadow: 0 8px 24px rgba(20, 23, 18, 0.14), inset 0 0 0 1px var(--line); }
.suggest-item { width: 100%; display: flex; align-items: baseline; justify-content: space-between; gap: 12px; min-height: 44px; padding: 8px 10px; border: 0; border-radius: 10px; background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.suggest-item:hover { background: var(--surface); }
.suggest-name { font: 400 17px/22px var(--font-display); }
.chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.chips-lab { margin-right: 2px; }
.small { height: 32px; font-size: 13px; padding: 0 12px; }
.chip-input { width: 140px; min-height: 36px; padding: 6px 14px; border-radius: 9999px; font: 400 15px/20px var(--font-display); }
.score { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: 10px; }
.score-q { padding: 0 0 10px; font: 400 24px/28px var(--font-display); }
.score-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.score-btn { height: 72px; border: 0; border-radius: 16px; background: var(--surface); color: var(--ink); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; }
.score-btn:hover { background: var(--surface-strong); }
.score-btn--on, .score-btn--on:hover { background: var(--primary); color: var(--on-primary); }
.score-n { font: 400 26px/1 var(--font-display); }
.score-w { font: 500 12px/14px var(--font-sans); text-align: center; }
.textarea { min-height: 96px; resize: vertical; font: italic 400 18px/26px var(--font-display); }
.toggles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.toggle { height: 48px; border: 0; border-radius: 14px; background: transparent; box-shadow: inset 0 0 0 1px var(--line-strong); color: var(--ink); display: flex; align-items: center; justify-content: center; gap: 8px; font: 600 15px/20px var(--font-sans); cursor: pointer; }
.toggle--fav { background: var(--accent); color: var(--on-accent); box-shadow: none; }
.toggle--on { background: var(--primary); color: var(--on-primary); box-shadow: none; }
.more { border-radius: 16px; background: var(--surface); }
.more-head { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px; padding: 8px 16px; border: 0; background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.more-text { display: flex; flex-direction: column; }
.more-title { font: 400 19px/22px var(--font-display); }
.more-chev { flex: none; transition: transform 150ms; }
.more-chev--open { transform: rotate(180deg); }
.more-body { display: flex; flex-direction: column; gap: 16px; padding: 4px 16px 18px; }
.last { color: var(--primary); }
.nums { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.num { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: 12px; background: var(--bg); cursor: text; min-width: 0; }
.num:focus-within { box-shadow: inset 0 0 0 2px var(--primary); }
.num--key { background: var(--primary); color: var(--on-primary); cursor: default; }
.num-k { font: 400 12px/16px var(--font-sans); opacity: 0.85; }
.num-input, .num-v { width: 100%; min-width: 0; border: 0; padding: 0; background: transparent; font: 400 22px/26px var(--font-display); color: inherit; outline: none; }
.num-input::placeholder { color: var(--ink-faint); }
.attr { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 48px; border-bottom: 1px solid var(--line); }
.attr:last-child { border-bottom: 0; }
.attr-k { font: 400 15px/20px var(--font-sans); }
.dots { display: flex; gap: 6px; }
.dot { width: 36px; height: 36px; border: 0; border-radius: 50%; background: var(--bg); box-shadow: inset 0 0 0 1px var(--line-strong); color: var(--ink-soft); font: 500 13px/1 var(--font-sans); cursor: pointer; }
.dot--on { background: var(--primary); box-shadow: none; color: var(--on-primary); }
.foot { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 12px 20px calc(env(safe-area-inset-bottom) + 16px); background: color-mix(in srgb, var(--bg) 95%, transparent); border-top: 1px solid var(--line); }
.share { position: relative; flex: 1; display: flex; align-items: center; gap: 10px; min-height: 44px; cursor: pointer; }
.share-text { order: 2; font: 500 14px/18px var(--font-sans); }
.share-input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.switch { order: 1; flex: none; position: relative; width: 44px; height: 26px; border-radius: 9999px; background: var(--ink-faint); transition: background-color 150ms; }
.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--bg); transition: transform 150ms; }
.share-input:checked + .switch { background: var(--primary); }
.share-input:checked + .switch::after { transform: translateX(18px); background: var(--on-primary); }
.share-input:focus-visible + .switch { outline: 2px solid var(--primary); outline-offset: 2px; }
.save { flex: none; padding: 0 22px; }
.save--full { flex: 1; }
.foot .v3-error { flex-basis: 100%; order: -1; }
.cancel { background: transparent; color: var(--ink); }
.cancel:hover { background: var(--surface); }
@media (prefers-reduced-motion: reduce) { .more-chev, .switch, .switch::after { transition: none; } }

@media (min-width: 1024px) {
  .note { max-width: 1180px; margin: 0 auto; width: 100%; padding: 40px 48px 64px; gap: 28px; }
  .mobile-only { display: none !important; }
  .desktop-only { display: flex !important; }
  .head { padding-right: 0; }
  .title { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .sub { font-size: 19px; line-height: 26px; }
  .layout { flex-direction: row; align-items: flex-start; gap: 40px; }
  .form { flex: 3 1 480px; gap: 26px; }
  .side { flex: 2 1 300px; min-width: 0; position: sticky; top: 24px; display: flex; flex-direction: column; gap: 16px; }
  .preview { flex-direction: column; gap: 10px; }
  .preview-eb { color: var(--ink-soft); }
  .preview-row { padding: 4px 16px; border-radius: 16px; background: var(--surface); }
  .nums { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .foot { position: static; flex-direction: column; align-items: stretch; padding: 0; background: transparent; border: 0; }
  .share { min-height: 52px; padding: 0 16px; border-radius: 14px; background: var(--surface); justify-content: space-between; }
  .share-text { order: 1; }
  .switch { order: 2; }
  .foot .v3-error { order: 0; }
}
</style>

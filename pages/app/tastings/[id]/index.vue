<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Coffee, Tasting, Visibility } from '~/types'

const route = useRoute()
const router = useRouter()
const { userId } = useAuth()
const tastingsStore = useTastingsStore()
const coffeesStore = useCoffeesStore()

const id = computed(() => route.params.id as string)
const tasting = ref<Tasting | null>(null)
const coffee = ref<Coffee | null>(null)
const loading = ref(true)
const notFound = ref(false)

// Solo el dueño edita/elimina/comparte; una cata de comunidad ajena es de
// solo lectura.
const isOwner = computed(() => !!tasting.value && tasting.value.userId === userId.value)

onMounted(async () => {
  try {
    await tastingsStore.loadById(id.value)
    tasting.value = tastingsStore.current as Tasting | null
    if (!tasting.value) {
      notFound.value = true
      return
    }
    if (!coffeesStore.list.length) await coffeesStore.loadAll().catch(() => {})
    coffee.value = (coffeesStore.list as Coffee[]).find(c => c.id === tasting.value!.coffeeId) ?? null
  }
  catch {
    notFound.value = true
  }
  finally {
    loading.value = false
  }
})

const shareOpen = ref(false)

function onShare() {
  if (!tasting.value) return
  shareOpen.value = true
}

function onShareSaved(visibility: Visibility, uids: string[]) {
  if (tasting.value) tasting.value = { ...tasting.value, visibility, sharedWith: uids }
}

const deleting = ref(false)

async function onEdit() {
  if (!tasting.value) return
  router.push(`/app/tastings/${tasting.value.id}/edit`)
}

const { confirm } = useConfirm()

async function onDelete() {
  if (!tasting.value || deleting.value) return
  const ok = await confirm({
    title: 'Eliminar cata',
    message: `Esta cata de "${tasting.value.coffeeName}" se borrará. No se puede deshacer.`,
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await tastingsStore.remove(tasting.value.id)
    router.replace('/app/tastings')
  }
  catch {
    // toast already surfaced
  }
  finally {
    deleting.value = false
  }
}

async function toggleFavorite() {
  if (!tasting.value) return
  const next = !tasting.value.isFavorite
  try {
    await tastingsStore.update(tasting.value.id, { isFavorite: next })
    tasting.value = { ...tasting.value, isFavorite: next }
  }
  catch {
    // toast surfaced
  }
}

// ─── Detalle v3 (interruptor «catas») ─────────────────────────────────────
const v3 = useFlag('catas')
const { getBrewMethodLabel, getProcessLabel } = useCatalog()

const blobClass = computed(() => {
  switch (coffee.value?.process) {
    case 'natural': return 'blob--natural'
    case 'washed': case 'experimental': return 'blob--washed'
    case 'other': case undefined: return 'blob--plain'
    default: return 'blob--soft'
  }
})
const score = computed(() => ratingToScore(tasting.value?.ratingOverall))
const byline = computed(() => {
  const t = tasting.value
  if (!t) return ''
  const proc = coffee.value?.process && coffee.value.process !== 'other' ? getProcessLabel(coffee.value.process).toLowerCase() : ''
  return [t.roasterName ? `de ${t.roasterName}` : '', proc].filter(Boolean).join(' · ')
})
const when = computed(() => {
  const t = tasting.value
  if (!t) return ''
  const ms = t.brewDate?.toMillis?.() ?? 0
  const date = ms ? formatRelativeDay(new Date(ms)) : ''
  const method = t.brewMethod && t.brewMethod !== 'other' ? getBrewMethodLabel(t.brewMethod) : ''
  return [method, date].filter(Boolean).join(' · ')
})
const ATTRS = [
  ['ratingAroma', 'Aroma'], ['ratingAcidity', 'Acidez'], ['ratingSweetness', 'Dulzura'],
  ['ratingBody', 'Cuerpo'], ['ratingAftertaste', 'Retrogusto'],
] as const
const attrs = computed(() => ATTRS
  .map(([k, label]) => ({ label, n: ratingToScore(tasting.value?.[k]) }))
  .filter(a => a.n > 0))
const prep = computed(() => {
  const t = tasting.value
  if (!t) return []
  return [
    { k: 'Receta', v: t.recipeName || '' },
    { k: 'Dosis', v: t.dose ? `${t.dose} g` : '' },
    { k: 'Agua', v: t.water ? `${t.water} ml` : '' },
    { k: 'Ratio', v: t.ratio || '' },
    { k: 'Tiempo', v: t.brewTime ? formatClock(t.brewTime) : '' },
  ].filter(x => x.v)
})

const menuOpen = ref(false)
function onMenuKey(e: KeyboardEvent) {
  if (e.key === 'Escape') menuOpen.value = false
}
function runMenu(fn: () => void | Promise<void>) {
  menuOpen.value = false
  fn()
}
</script>

<template>
  <div v-if="v3" class="v3 detail">
    <nav class="topbar" aria-label="Acciones de la cata">
      <button type="button" class="back" @click="router.back()">
        <Icon name="lucide:arrow-left" size="22" /><span class="back-label">Tus catas</span>
      </button>
      <div v-if="tasting && isOwner" class="top-actions">
        <button
          type="button"
          :class="['icon-btn', 'fav-btn', { 'fav-btn--on v3-pop': tasting.isFavorite }]"
          :aria-pressed="!!tasting.isFavorite"
          :aria-label="tasting.isFavorite ? 'Quitar de favoritas' : 'Marcar como favorita'"
          @click="toggleFavorite"
        >
          <Icon name="lucide:heart" size="20" mode="svg" :class="{ 'v3-icon-fill': tasting.isFavorite }" />
          <span class="desktop-only fav-label">Favorita</span>
        </button>
        <button type="button" class="icon-btn mobile-only" aria-label="Compartir" @click="onShare"><Icon name="lucide:share-2" size="20" /></button>
        <button type="button" class="icon-btn mobile-only" aria-label="Más acciones: editar o eliminar" @click="menuOpen = true"><Icon name="lucide:ellipsis" size="20" /></button>
        <button type="button" class="v3-btn v3-btn--secondary small desktop-only" @click="onShare">Compartir</button>
        <button type="button" class="v3-btn v3-btn--secondary small desktop-only" @click="onEdit">Editar</button>
        <button type="button" class="v3-btn small danger desktop-only" :disabled="deleting" @click="onDelete">Eliminar</button>
      </div>
    </nav>

    <div v-if="loading" class="state"><span class="v3-spinner" aria-label="Cargando" /></div>

    <div v-else-if="notFound" class="state">
      <p class="state-text">No encontramos esta cata.</p>
      <NuxtLink to="/app/tastings" class="v3-btn v3-btn--primary">Volver a mis catas</NuxtLink>
    </div>

    <div v-else-if="tasting" class="layout">
      <div class="main">
        <article aria-labelledby="tasting-name" class="hero">
          <span :class="['blob', blobClass]" aria-hidden="true" />
          <div class="hero-in">
            <div class="hero-top">
              <div class="hero-id">
                <h1 id="tasting-name" class="name">{{ tasting.coffeeName.replace(/\.$/, '') }}</h1>
                <p v-if="byline" class="byline">{{ byline }}</p>
                <p v-if="when" class="v3-meta m0">{{ when }}</p>
              </div>
              <div v-if="score" class="score">
                <span class="score-num">{{ score }}</span>
                <span class="score-word">{{ scoreWord(tasting.ratingOverall).toLowerCase() }}</span>
                <span class="v3-meta score-lab">Tu puntaje</span>
              </div>
            </div>
            <div v-if="tasting.isFavorite || tasting.wouldBuyAgain || (tasting.flavorNotes || []).length" class="chips">
              <span v-if="tasting.isFavorite" class="chip chip--fav"><Icon name="lucide:heart" size="14" mode="svg" class="v3-icon-fill" />Favorita</span>
              <span v-if="tasting.wouldBuyAgain" class="chip"><Icon name="lucide:rotate-ccw" size="14" />Repetiría</span>
              <span v-for="f in tasting.flavorNotes || []" :key="f" class="chip">{{ f }}</span>
            </div>
            <blockquote v-if="tasting.personalNotes" class="quote">«{{ tasting.personalNotes }}»</blockquote>
          </div>
        </article>

        <section v-if="attrs.length" aria-labelledby="tasting-attrs" class="section">
          <h2 id="tasting-attrs" class="section-title">Lo que sentiste</h2>
          <dl class="attrs">
            <div v-for="a in attrs" :key="a.label" class="attr">
              <dt>{{ a.label }}</dt>
              <dd>
                <span class="dots" aria-hidden="true"><span v-for="n in 5" :key="n" :class="['dot', { 'dot--on': n <= a.n }]" /></span>
                <span class="attr-v">{{ a.n }} · {{ SCORE_WORDS[a.n].toLowerCase() }}</span>
              </dd>
            </div>
          </dl>
        </section>

        <section v-if="prep.length" aria-labelledby="tasting-prep" class="section">
          <h2 id="tasting-prep" class="section-title">Cómo la preparaste</h2>
          <dl class="prep">
            <div v-for="p in prep" :key="p.k" class="prep-item"><dt>{{ p.k }}</dt><dd>{{ p.v }}</dd></div>
          </dl>
        </section>
      </div>

      <aside v-if="isOwner" class="side">
        <section aria-label="Siguiente" class="next">
          <NuxtLink :to="`/app/tastings/new?coffeeId=${tasting.coffeeId}`" class="next-row">
            <span class="next-text"><span class="next-title">Repetir esta cata</span><span class="v3-meta">Nueva nota del mismo café</span></span>
            <Icon name="lucide:chevron-right" size="18" class="next-chevron" />
          </NuxtLink>
          <NuxtLink v-if="coffee" :to="`/app/coffees/${coffee.id}`" class="next-row">
            <span class="next-text"><span class="next-title">Ver este café</span><span class="v3-meta">Ficha y todas sus catas</span></span>
            <Icon name="lucide:chevron-right" size="18" class="next-chevron" />
          </NuxtLink>
        </section>
      </aside>
    </div>

    <Teleport to="body">
      <Transition name="v3-sheet">
        <div v-if="menuOpen" class="v3 v3-sheet-wrap" @keydown="onMenuKey">
          <div class="v3-sheet-veil" aria-hidden="true" @click="menuOpen = false" />
          <section role="dialog" aria-modal="true" aria-labelledby="tasting-menu-title" class="v3-sheet">
            <span class="v3-sheet-handle" aria-hidden="true" />
            <div class="v3-sheet-head">
              <h2 id="tasting-menu-title" class="v3-sheet-title">{{ tasting?.coffeeName }}</h2>
              <button type="button" class="v3-sheet-close" aria-label="Cerrar" @click="menuOpen = false"><Icon name="lucide:x" size="20" /></button>
            </div>
            <div class="menu">
              <button type="button" class="menu-item" @click="runMenu(onEdit)"><Icon name="lucide:pencil" size="20" />Editar</button>
              <button type="button" class="menu-item menu-item--danger" @click="runMenu(onDelete)"><Icon name="lucide:trash-2" size="20" />Eliminar</button>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>

    <UiShareSheet
      v-if="tasting"
      v-model="shareOpen"
      :entity-name="`cata de ${tasting.coffeeName}`"
      entity-kind="tasting"
      :initial-visibility="tasting.visibility ?? 'private'"
      :initial-shared-with="tasting.sharedWith ?? []"
      :on-save="(visibility, uids) => tastingsStore.updateVisibility(tasting!.id, visibility, uids)"
      @saved="onShareSaved"
    />
  </div>

  <div v-else class="mx-auto w-full max-w-[1200px] px-md pt-md pb-2xl lg:px-xl xl:px-2xl lg:pt-xl">
    <header class="flex items-center justify-between gap-md">
      <button
        type="button"
        class="inline-flex items-center justify-center size-[44px] rounded-pill text-moss hover:bg-surface-2/60 transition-colors"
        aria-label="Volver"
        @click="router.back()"
      >
        <Icon name="lucide:arrow-left" class="size-5" />
      </button>
      <UiEyebrow>Cata</UiEyebrow>
      <UiActionMenu v-if="tasting && isOwner" aria-label="Más acciones">
        <UiActionMenuItem :icon="tasting.isFavorite ? 'lucide:heart-off' : 'lucide:heart'" @click="toggleFavorite">
          {{ tasting.isFavorite ? 'Quitar favorito' : 'Marcar favorito' }}
        </UiActionMenuItem>
        <UiActionMenuItem icon="lucide:share-2" @click="onShare">
          Compartir
        </UiActionMenuItem>
        <UiActionMenuItem icon="lucide:pencil" @click="onEdit">
          Editar
        </UiActionMenuItem>
        <UiActionMenuItem destructive icon="lucide:trash-2" @click="onDelete">
          Eliminar
        </UiActionMenuItem>
      </UiActionMenu>
      <div v-else class="size-[44px]" aria-hidden="true" />
    </header>

    <div class="mt-lg max-w-[640px] mx-auto">
      <div v-if="loading" class="flex justify-center py-2xl">
        <span class="size-6 animate-spin rounded-full border-2 border-moss/20 border-t-moss" />
      </div>

      <div v-else-if="notFound" class="flex flex-col items-center gap-lg py-2xl">
        <p class="font-display italic text-moss-soft text-center">
          No encontramos esta cata.
        </p>
        <UiButton variant="dark" :block="false" to="/app/tastings">
          Volver a mis catas
        </UiButton>
      </div>

      <TastingDetail v-else-if="tasting" :tasting="tasting" :coffee="coffee" />

      <!-- Related actions — cierra el "acabo de ver esta cata, ¿ahora
           qué?". Repetir la cata (prefill coffeeId) o saltar al detalle
           del café. Solo cuando el usuario es dueño (visitantes usan la
           navegación externa). -->
      <section
        v-if="tasting && !loading && !notFound && isOwner"
        class="mt-2xl border-t border-moss/10 pt-lg"
      >
        <UiEyebrow>Siguiente</UiEyebrow>
        <div class="mt-sm grid grid-cols-1 sm:grid-cols-2 gap-sm">
          <UiQuickCard
            eyebrow="Acelerador"
            label="Repetir esta cata"
            hint="Nueva cata del mismo café"
            :to="`/app/tastings/new?coffeeId=${tasting.coffeeId}`"
          />
          <UiQuickCard
            v-if="coffee"
            eyebrow="Contexto"
            label="Ver este café"
            hint="Detalle + histórico"
            :to="`/app/coffees/${coffee.id}`"
          />
        </div>
      </section>
    </div>

    <UiShareSheet
      v-if="tasting"
      v-model="shareOpen"
      :entity-name="`cata de ${tasting.coffeeName}`"
      entity-kind="tasting"
      :initial-visibility="tasting.visibility ?? 'private'"
      :initial-shared-with="tasting.sharedWith ?? []"
      :on-save="(visibility, uids) => tastingsStore.updateVisibility(tasting!.id, visibility, uids)"
      @saved="onShareSaved"
    />
  </div>
</template>

<style scoped>
.detail { box-sizing: border-box; max-width: 1180px; padding: 8px 20px 120px; display: flex; flex-direction: column; gap: 16px; }
.desktop-only { display: none !important; }
.m0 { margin: 0; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.back { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-left: -12px; padding: 0 12px; border: 0; background: transparent; color: var(--ink); font: 600 15px/20px var(--font-sans); cursor: pointer; }
.back-label { display: none; }
.top-actions { display: flex; align-items: center; gap: 8px; }
.icon-btn { min-width: 44px; height: 44px; border: 0; border-radius: 12px; background: transparent; color: var(--ink); display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
.fav-btn--on { color: var(--accent); }
.small { height: 40px; font-size: 14px; }
.danger { background: transparent; color: var(--danger); }
.danger:hover:not(:disabled) { background: var(--surface); }
.state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 64px 0; }
.state-text { margin: 0; font: italic 400 18px/26px var(--font-display); color: var(--ink-soft); }
.layout { display: flex; flex-direction: column; gap: 24px; }
.main, .side { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
.hero { position: relative; overflow: hidden; border-radius: 28px; background: var(--surface-strong); }
.blob { position: absolute; right: -90px; top: -110px; width: 320px; height: 320px; border-radius: 50%; pointer-events: none; }
.blob--natural { background: var(--accent); opacity: 0.38; }
.blob--washed { background: var(--tint); opacity: 0.42; }
.blob--soft { background: var(--accent); opacity: 0.26; }
.blob--plain { background: var(--surface); }
.hero-in { position: relative; display: flex; flex-direction: column; gap: 16px; padding: 22px 20px 20px; }
.hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.hero-id { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.name { margin: 0; font: 400 44px/0.95 var(--font-display); letter-spacing: -0.02em; overflow-wrap: anywhere; }
.byline { margin: 4px 0 0; font: italic 400 17px/22px var(--font-display); }
.score { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; color: var(--primary); }
.score-num { font: 400 64px/0.9 var(--font-display); }
.score-word { font: italic 400 20px/24px var(--font-display); }
.score-lab { font-size: 12px; line-height: 16px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 9999px; background: color-mix(in srgb, var(--bg) 70%, transparent); font: 500 13px/16px var(--font-sans); }
.chip--fav { background: var(--accent); color: var(--on-accent); }
.quote { margin: 0; padding-top: 14px; border-top: 1px solid var(--line); font: italic 400 19px/26px var(--font-display); }
.section { display: flex; flex-direction: column; gap: 10px; }
.section-title { margin: 0; font: 400 24px/28px var(--font-display); }
.attrs, .prep { margin: 0; display: flex; flex-direction: column; padding: 6px 16px; border-radius: 16px; background: var(--surface); }
.attr { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; border-bottom: 1px solid var(--line); }
.attr:last-child, .prep-item:last-child { border-bottom: 0; }
.attr dt { font: 400 15px/20px var(--font-sans); }
.attr dd { margin: 0; display: flex; align-items: center; gap: 10px; }
.dots { display: flex; gap: 5px; }
.dot { width: 12px; height: 12px; border-radius: 50%; background: var(--track); }
.dot--on { background: var(--primary); }
.attr-v { min-width: 84px; font: 400 14px/20px var(--font-sans); color: var(--ink-soft); }
.prep-item { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.prep-item dt { font: 400 15px/22px var(--font-sans); color: var(--ink-soft); }
.prep-item dd { margin: 0; font: 500 15px/22px var(--font-sans); text-align: right; }
.next { display: flex; flex-direction: column; padding: 4px 14px; border-radius: 16px; background: var(--surface); }
.next-row { display: flex; align-items: center; gap: 14px; min-height: 64px; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--line); }
.next-row:last-child { border-bottom: 0; }
.next-text { flex: 1; display: flex; flex-direction: column; }
.next-title { font: 400 19px/22px var(--font-display); }
.next-chevron { flex: none; color: var(--ink-soft); }
.menu { display: flex; flex-direction: column; padding: 4px 12px calc(20px + env(safe-area-inset-bottom)); }
.menu-item { display: flex; align-items: center; gap: 14px; min-height: 56px; padding: 0 12px; border: 0; border-radius: 12px; background: transparent; color: var(--ink); font: 500 16px/22px var(--font-sans); cursor: pointer; }
.menu-item:hover { background: var(--surface); }
.menu-item--danger { color: var(--danger); }

@media (min-width: 1024px) {
  .detail { padding: 24px 48px 64px; gap: 24px; }
  .mobile-only { display: none !important; }
  .desktop-only { display: inline-flex !important; }
  .back-label { display: inline; }
  .fav-btn { height: 40px; padding: 0 14px; background: var(--surface); font: 600 14px/18px var(--font-sans); }
  .fav-btn--on { background: var(--accent); color: var(--on-accent); }
  .layout { flex-direction: row; align-items: flex-start; gap: 40px; }
  .main { flex: 3 1 460px; gap: 28px; }
  .side { flex: 2 1 300px; position: sticky; top: 24px; }
  .hero { border-radius: 32px; }
  .blob { right: -120px; top: -160px; width: 480px; height: 480px; }
  .hero-in { padding: 32px 32px 28px; gap: 20px; }
  .name { font-size: 72px; line-height: 0.92; }
  .byline { font-size: 22px; line-height: 28px; }
  .score-num { font-size: 96px; line-height: 0.85; }
  .score-word { font-size: 24px; line-height: 28px; }
  .quote { font-size: 22px; line-height: 30px; }
  .section-title { font-size: 28px; line-height: 32px; }
  .next { background: transparent; box-shadow: inset 0 0 0 1px var(--line); border-radius: 18px; padding: 4px 16px; }
}
</style>

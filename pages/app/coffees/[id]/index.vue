<script setup lang="ts">
import { scoreTone as scoreTone1to5 } from '~/utils/score'
import { computed, onMounted, ref } from 'vue'
import type { Coffee, CoffeeProcess, RoastLevel, Tasting, Visibility } from '~/types'

const route = useRoute()
const router = useRouter()
const { userId } = useAuth()
const coffeesStore = useCoffeesStore()
const tastingsStore = useTastingsStore()
const wishlistStore = useWishlistStore()

const id = computed(() => route.params.id as string)
const coffee = ref<Coffee | null>(null)
const loading = ref(true)
const notFound = ref(false)

// Solo el dueño puede editar/eliminar/compartir. Un café de comunidad ajeno
// es de solo lectura.
const isOwner = computed(() => !!coffee.value && coffee.value.userId === userId.value)

onMounted(async () => {
  try {
    await coffeesStore.loadById(id.value)
    coffee.value = coffeesStore.current as Coffee | null
    if (!coffee.value) {
      notFound.value = true
    }
    tastingsStore.loadAll().catch(() => {})
    // La wishlist alimenta el estado del botón "A mi wishlist" para visitantes.
    if (wishlistStore.list.length === 0) wishlistStore.loadAll().catch(() => {})
  }
  catch {
    notFound.value = true
  }
  finally {
    loading.value = false
  }
})

const processLabel: Record<CoffeeProcess, string> = {
  washed: 'Lavado',
  natural: 'Natural',
  honey: 'Honey',
  anaerobic: 'Anaeróbico',
  carbonic: 'Carbónico',
  experimental: 'Experimental',
  other: 'Otro',
}

const roastLabel: Record<RoastLevel, string> = {
  light: 'Claro',
  medium_light: 'Medio claro',
  medium: 'Medio',
  medium_dark: 'Medio oscuro',
  dark: 'Oscuro',
}

const purchaseChannelLabel: Record<string, string> = {
  website: 'Web',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  shop: 'Tienda',
  other: 'Otro',
}

const purchaseInfo = computed(() => {
  const c = coffee.value
  if (!c) return ''
  const channel = c.purchaseChannel ? purchaseChannelLabel[c.purchaseChannel] || '' : ''
  const ref = c.purchaseReference || ''
  if (channel && ref) return `${channel} · ${ref}`
  return channel || ref
})

const eyebrow = computed(() => {
  if (!coffee.value) return ''
  const parts = [
    coffee.value.process ? processLabel[coffee.value.process] : '',
    coffee.value.originRegion,
    coffeeVarieties(coffee.value).join(' · '),
  ].filter(Boolean)
  return parts.join(' · ')
})

const tagline = computed(() => {
  const notes = coffee.value?.flavorNotes || []
  if (notes.length === 0) return ''
  if (notes.length === 1) return `${notes[0]}.`
  if (notes.length === 2) return `${notes[0]} y ${notes[1]}.`
  return `${notes.slice(0, -1).join(', ')} y ${notes[notes.length - 1]}.`
})

const pricePerGram = computed(() => {
  const c = coffee.value
  if (!c?.price || !c?.weight) return null
  const value = c.price / c.weight
  return value >= 100 ? Math.round(value) : Math.round(value * 10) / 10
})

const coffeeTastings = computed<Tasting[]>(() => {
  const list = (tastingsStore.list as Tasting[]) || []
  return list.filter(t => t.coffeeId === id.value)
})

// Con el interruptor «catas» los puntajes de catas se muestran de 1 a 5.
const catas1to5 = useFlag('catas')

const tastingsCount = computed(() => coffeeTastings.value.length)

const lastTastingScore = computed(() => {
  const list = coffeeTastings.value
  if (list.length === 0) return null
  const sorted = [...list].sort((a, b) => {
    const ta = a.brewDate?.toMillis?.() ?? 0
    const tb = b.brewDate?.toMillis?.() ?? 0
    return tb - ta
  })
  const r = sorted[0].ratingOverall
  if (typeof r !== 'number') return null
  return catas1to5.value ? ratingToScore(r) || null : r
})

const currentYear = new Date().getFullYear()

function formatPrice(p?: number): string {
  if (!p) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p)
}

function onEdit() {
  if (!coffee.value) return
  router.push(`/app/coffees/${coffee.value.id}/edit`)
}

const shareOpen = ref(false)

function onShare() {
  if (!coffee.value) return
  shareOpen.value = true
}

function onShareSaved(visibility: Visibility, uids: string[]) {
  if (coffee.value) coffee.value = { ...coffee.value, visibility, sharedWith: uids }
}

// ── Acciones para visitantes (no-owners) ─────────────────────────────────────
const inWishlist = computed(() =>
  !!coffee.value && !!wishlistStore.findMatchingItem(coffee.value),
)

const savingToWishlist = ref(false)
async function onSaveToWishlist() {
  if (!coffee.value || savingToWishlist.value) return
  savingToWishlist.value = true
  try {
    await wishlistStore.addFromCoffee(coffee.value)
  }
  finally {
    savingToWishlist.value = false
  }
}

const duplicating = ref(false)
async function onDuplicate() {
  if (!coffee.value || duplicating.value) return
  duplicating.value = true
  try {
    const newId = await coffeesStore.duplicate(coffee.value)
    if (newId) router.push(`/app/coffees/${newId}`)
  }
  finally {
    duplicating.value = false
  }
}

const deleting = ref(false)
const { confirm } = useConfirm()

async function onDelete() {
  if (!coffee.value || deleting.value) return
  const ok = await confirm({
    title: `Eliminar "${coffee.value.name}"`,
    message: 'Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await coffeesStore.remove(coffee.value.id)
    router.replace('/app/coffees')
  }
  catch {
    // Toast surfaced by store
  }
  finally {
    deleting.value = false
  }
}
// ─── Detalle v3 (interruptor «cafes») ─────────────────────────────────────
const v3 = useFlag('cafes')
// Compartir como imagen (interruptor «compartir»).
const shareImageOn = useFlag('compartir')
const imageOpen = ref(false)
const { getBrewMethodLabel } = useCatalog()

const blobClass = computed(() => {
  switch (coffee.value?.process) {
    case 'natural': return 'blob--natural'
    case 'washed': case 'experimental': return 'blob--washed'
    case 'other': case undefined: return 'blob--plain'
    default: return 'blob--soft'
  }
})

const displayName = computed(() => {
  const n = coffee.value?.name || ''
  return n.endsWith('.') ? n.slice(0, -1) : n
})

const scoreParts = computed(() => {
  const sca = coffee.value?.scaScore
  if (typeof sca !== 'number') return null
  const [int, dec] = (Math.round(sca * 10) / 10).toFixed(1).split('.')
  return { int, dec: dec === '0' ? '' : `.${dec}` }
})

const specs = computed(() => {
  const c = coffee.value
  if (!c) return []
  return [
    { k: 'Proceso', v: c.process && c.process !== 'other' ? processLabel[c.process] : '' },
    { k: coffeeVarieties(c).length > 1 ? 'Variedades' : 'Variedad', v: coffeeVarieties(c).join(' · ') },
    { k: 'Origen', v: [c.originRegion, c.originCountry].filter(Boolean).join(', ') },
    { k: 'Altitud', v: c.altitude ? `${c.altitude.toLocaleString('es-CO')} msnm` : '' },
    { k: 'Tueste', v: c.roastLevel ? roastLabel[c.roastLevel] : '' },
    { k: 'Finca', v: c.originFarm || '' },
    { k: 'Productor', v: c.originProducer || '' },
    { k: 'Precio', v: c.price ? formatPrice(c.price) : '' },
    { k: 'Peso', v: c.weight ? `${c.weight} g` : '' },
    { k: 'Precio por gramo', v: pricePerGram.value !== null ? `$${pricePerGram.value}` : '' },
    { k: 'Comprado en', v: purchaseInfo.value },
  ].filter(x => x.v)
})

function tsMillis(ts: any): number {
  return ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0)
}
const recentCoffeeTastings = computed(() =>
  [...coffeeTastings.value]
    .sort((a, b) => (tsMillis(b.brewDate) || tsMillis(b.createdAt)) - (tsMillis(a.brewDate) || tsMillis(a.createdAt)))
    .slice(0, 3)
    .map((t) => {
      const n = t.ratingOverall
      return {
        id: t.id,
        method: t.brewMethod ? getBrewMethodLabel(t.brewMethod) : 'Cata',
        day: formatRelativeDay(new Date(tsMillis(t.brewDate) || tsMillis(t.createdAt))),
        score: typeof n !== 'number' ? '—' : catas1to5.value ? String(ratingToScore(n) || '—') : String(Math.round(n * 10) / 10),
        tone: typeof n !== 'number' ? 'none' : catas1to5.value ? scoreTone1to5(n) : n >= 9 ? 'high' : n >= 7.5 ? 'good' : 'none',
      }
    }),
)

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
    <nav class="topbar" aria-label="Acciones del café">
      <button type="button" class="back" @click="router.back()">
        <Icon name="lucide:arrow-left" size="22" /><span class="back-label">Mi colección</span>
      </button>
      <div v-if="coffee && isOwner" class="top-actions">
        <button v-if="shareImageOn" type="button" class="icon-btn mobile-only" aria-label="Compartir como imagen" @click="imageOpen = true"><Icon name="lucide:image" size="20" /></button>
        <button type="button" class="icon-btn mobile-only" aria-label="Compartir" @click="onShare"><Icon name="lucide:share-2" size="20" /></button>
        <button type="button" class="icon-btn mobile-only" aria-label="Más acciones: editar o eliminar" @click="menuOpen = true"><Icon name="lucide:ellipsis" size="20" /></button>
        <button type="button" class="v3-btn v3-btn--secondary small desktop-only" @click="onShare">Compartir</button>
        <button v-if="shareImageOn" type="button" class="v3-btn v3-btn--secondary small desktop-only" @click="imageOpen = true">Imagen</button>
        <button type="button" class="v3-btn v3-btn--secondary small desktop-only" @click="onEdit">Editar</button>
        <button type="button" class="v3-btn small danger desktop-only" :disabled="deleting" @click="onDelete">Eliminar</button>
      </div>
    </nav>

    <div v-if="loading" class="state"><span class="v3-spinner" aria-label="Cargando" /></div>

    <div v-else-if="notFound" class="state">
      <p class="state-text">No encontramos este café.</p>
      <NuxtLink to="/app/coffees" class="v3-btn v3-btn--primary">Volver a mi colección</NuxtLink>
    </div>

    <div v-else-if="coffee" class="layout">
      <div class="main">
        <article aria-labelledby="coffee-name" class="hero">
          <span :class="['blob', blobClass]" aria-hidden="true" />
          <div class="hero-in">
            <div class="hero-top">
              <div class="hero-id">
                <h1 id="coffee-name" class="name">{{ displayName }}</h1>
                <p v-if="coffee.roasterName" class="roaster">de {{ coffee.roasterName }}</p>
              </div>
              <div v-if="scoreParts" class="score">
                <span class="score-num">{{ scoreParts.int }}<span class="score-dec">{{ scoreParts.dec }}</span></span>
                <span class="score-lab">Puntaje SCA</span>
                <span class="v3-meta score-sub">según la marca</span>
              </div>
            </div>
            <div v-if="(coffee.flavorNotes || []).length" class="notes" aria-label="Notas en taza">
              <span v-for="n in coffee.flavorNotes" :key="n" class="note">{{ n }}</span>
            </div>
          </div>
        </article>

        <div v-if="isOwner" class="cta-bar">
          <NuxtLink :to="`/app/tastings/new?coffeeId=${coffee.id}`" class="cta">
            <span class="cta-main"><Icon name="lucide:plus" size="20" />Cata este café</span>
            <span class="cta-meta">
              <template v-if="tastingsCount > 0">{{ tastingsCount }} {{ tastingsCount === 1 ? 'cata' : 'catas' }}<template v-if="lastTastingScore !== null"> · última {{ lastTastingScore }}</template></template>
              <template v-else>Aún sin catas</template>
            </span>
          </NuxtLink>
        </div>
        <div v-else class="cta-bar cta-bar--pair">
          <button type="button" class="v3-btn v3-btn--secondary" :disabled="savingToWishlist" @click="onSaveToWishlist">
            <Icon :name="inWishlist ? 'lucide:bookmark-check' : 'lucide:bookmark'" size="18" />{{ inWishlist ? 'En tu wishlist' : 'A mi wishlist' }}
          </button>
          <button type="button" class="v3-btn v3-btn--primary" :disabled="duplicating" @click="onDuplicate">
            <Icon name="lucide:plus" size="18" />A mi colección
          </button>
        </div>

        <section v-if="isOwner && recentCoffeeTastings.length" aria-labelledby="coffee-tastings" class="tastings">
          <div class="section-head">
            <h2 id="coffee-tastings" class="section-title">Tus catas de este café</h2>
            <NuxtLink to="/app/tastings" class="v3-link">Ver todas</NuxtLink>
          </div>
          <div class="tasting-list">
            <NuxtLink v-for="t in recentCoffeeTastings" :key="t.id" :to="`/app/tastings/${t.id}`" class="tasting">
              <span class="t-score" :class="`tone-${t.tone}`">{{ t.score }}</span>
              <span class="t-text"><span class="t-method">{{ t.method }}</span><span class="v3-meta">{{ t.day }}</span></span>
              <Icon name="lucide:chevron-right" size="18" class="t-chevron" />
            </NuxtLink>
          </div>
        </section>
      </div>

      <aside v-if="specs.length" aria-labelledby="coffee-specs" class="specs">
        <h2 id="coffee-specs" class="v3-eyebrow specs-title">— Ficha</h2>
        <dl class="spec-list">
          <div v-for="sp in specs" :key="sp.k" class="spec"><dt>{{ sp.k }}</dt><dd>{{ sp.v }}</dd></div>
        </dl>
      </aside>
    </div>

    <Teleport to="body">
      <Transition name="v3-sheet">
        <div v-if="menuOpen" class="v3 v3-sheet-wrap" @keydown="onMenuKey">
          <div class="v3-sheet-veil" aria-hidden="true" @click="menuOpen = false" />
          <section role="dialog" aria-modal="true" aria-labelledby="coffee-menu-title" class="v3-sheet">
            <span class="v3-sheet-handle" aria-hidden="true" />
            <div class="v3-sheet-head">
              <h2 id="coffee-menu-title" class="v3-sheet-title">{{ coffee?.name }}</h2>
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
      v-if="coffee"
      v-model="shareOpen"
      :entity-name="coffee.name"
      entity-kind="coffee"
      :initial-visibility="coffee.visibility ?? 'private'"
      :initial-shared-with="coffee.sharedWith ?? []"
      :on-save="(visibility, uids) => coffeesStore.updateVisibility(coffee!.id, visibility, uids)"
      @saved="onShareSaved"
    />
    <V3ShareImageSheet v-if="coffee && shareImageOn" v-model="imageOpen" kind="cafe" :item="coffee" />
  </div>

  <div v-else class="relative min-h-svh flex flex-col">
    <!-- Top header -->
    <header class="sticky top-0 z-10 bg-paper/95 backdrop-blur-md border-b border-moss/5">
      <div class="mx-auto w-full max-w-[1200px] flex items-center justify-between gap-md px-md py-sm lg:px-xl xl:px-2xl">
        <button
          type="button"
          class="inline-flex items-center justify-center size-[44px] rounded-pill text-moss hover:bg-surface-2/60 transition-colors"
          aria-label="Volver"
          @click="router.back()"
        >
          <Icon name="lucide:arrow-left" class="size-5" />
        </button>
        <UiEyebrow class="truncate text-center flex-1">
          {{ coffee?.roasterName || 'Café' }}
        </UiEyebrow>
        <UiActionMenu v-if="coffee && isOwner" aria-label="Más acciones">
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
      </div>
    </header>

    <main class="flex-1 mx-auto w-full max-w-[1200px] px-md pt-lg pb-[180px] lg:px-xl xl:px-2xl lg:pt-xl lg:pb-2xl">
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-2xl">
        <span class="size-6 animate-spin rounded-full border-2 border-moss/20 border-t-moss" />
      </div>

      <!-- Not found -->
      <div v-else-if="notFound" class="flex flex-col items-center gap-lg py-2xl">
        <p class="font-display italic text-moss-soft text-center">
          No encontramos este café.
        </p>
        <UiButton variant="dark" :block="false" to="/app/coffees">
          Volver a mi colección
        </UiButton>
      </div>

      <!-- Detail -->
      <template v-else-if="coffee">
        <UiEyebrow>{{ eyebrow }}</UiEyebrow>

        <h1 class="mt-md font-display tracking-[-0.02em] leading-[0.95] text-moss text-[64px] sm:text-[72px] lg:text-[96px]">
          {{ coffee.name.endsWith('.') ? coffee.name.slice(0, -1) : coffee.name }}
        </h1>

        <p v-if="tagline" class="mt-md font-display italic text-[14px] lg:text-[16px] text-moss-soft max-w-prose">
          {{ tagline }}
        </p>

        <!-- Score block -->
        <div v-if="coffee.scaScore" class="mt-2xl flex items-end justify-between gap-md border-b border-moss/10 pb-lg">
          <div class="flex items-baseline gap-xxs">
            <span class="font-display text-[80px] leading-none text-olive">
              {{ Math.floor(coffee.scaScore) }}
            </span>
            <span class="font-display text-[40px] leading-none text-olive">
              .{{ ((coffee.scaScore % 1).toFixed(1)).slice(2) || '0' }}
            </span>
          </div>
          <div class="flex flex-col gap-xxs items-end text-right">
            <UiEyebrow>Puntaje</UiEyebrow>
            <UiEyebrow>SCA · {{ currentYear }}</UiEyebrow>
          </div>
        </div>

        <!-- Notas en taza -->
        <section v-if="(coffee.flavorNotes || []).length > 0" class="mt-xl">
          <UiEyebrow>Notas en taza</UiEyebrow>
          <div class="mt-sm flex flex-wrap gap-xxs">
            <UiChip v-for="n in coffee.flavorNotes" :key="n" variant="active">
              {{ n }}
            </UiChip>
          </div>
        </section>

        <!-- Specs -->
        <section class="mt-xl">
          <UiSpecRow v-if="coffee.originRegion || coffee.originCountry" label="Origen">
            {{ [coffee.originRegion, coffee.originCountry].filter(Boolean).join(', ') }}
          </UiSpecRow>
          <UiSpecRow v-if="coffee.altitude" label="Altitud">
            {{ coffee.altitude.toLocaleString('es-CO') }} msnm
          </UiSpecRow>
          <UiSpecRow v-if="coffee.roastLevel" label="Tueste">
            {{ roastLabel[coffee.roastLevel] }}
          </UiSpecRow>
          <UiSpecRow v-if="coffee.originFarm" label="Finca">
            {{ coffee.originFarm }}
          </UiSpecRow>
          <UiSpecRow v-if="coffee.originProducer" label="Productor">
            {{ coffee.originProducer }}
          </UiSpecRow>
          <UiSpecRow v-if="pricePerGram !== null" label="Precio / g" :bare="!coffee.price">
            ${{ pricePerGram }} / g
          </UiSpecRow>
          <UiSpecRow v-if="coffee.price" label="Precio total" :bare="!coffee.weight">
            {{ formatPrice(coffee.price) }}
          </UiSpecRow>
          <UiSpecRow v-if="coffee.weight" label="Peso" bare>
            {{ coffee.weight }} g
          </UiSpecRow>
          <UiSpecRow v-if="purchaseInfo" label="Comprado en">
            {{ purchaseInfo }}
          </UiSpecRow>
        </section>
      </template>
    </main>

    <!-- Sticky CTA — solo para el dueño; un café de comunidad ajeno es de
         solo lectura. Sits above the mobile TabBar (~56px + safe-area). -->
    <div
      v-if="coffee && !loading && !notFound && isOwner"
      class="fixed inset-x-0 z-20 px-md pt-sm pb-sm lg:px-xl xl:px-2xl bottom-[calc(56px+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-[calc(env(safe-area-inset-bottom)+12px)]"
    >
      <div class="mx-auto w-full max-w-[1200px]">
        <NuxtLink
          :to="`/app/tastings/new?coffeeId=${coffee.id}`"
          class="group flex items-center justify-between gap-md rounded-card-lg bg-jungle text-paper p-md sm:p-lg transition-transform duration-200 ease-sorbo hover:-translate-y-[2px]"
        >
          <div class="flex flex-col gap-xs min-w-0">
            <UiEyebrow class="text-paper/60">
              <template v-if="tastingsCount > 0">
                {{ tastingsCount }} {{ tastingsCount === 1 ? 'cata' : 'catas' }}
                <template v-if="lastTastingScore !== null"> · última {{ lastTastingScore }}</template>
              </template>
              <template v-else>
                Aún sin catas
              </template>
            </UiEyebrow>
            <span class="font-display text-[24px] leading-none">Cata este café</span>
          </div>
          <span
            aria-hidden="true"
            class="flex shrink-0 items-center justify-center rounded-pill bg-honey text-jungle size-[44px] sm:size-[48px] transition-transform duration-200 ease-sorbo group-hover:translate-x-[2px]"
          >
            <Icon name="lucide:plus" class="size-5" />
          </span>
        </NuxtLink>
      </div>
    </div>

    <!-- Sticky CTA para visitantes (cafés de comunidad ajenos). Replica las
         acciones disponibles desde Explora: guardar a wishlist + duplicar. -->
    <div
      v-if="coffee && !loading && !notFound && !isOwner"
      class="fixed inset-x-0 z-20 px-md pt-sm pb-sm lg:px-xl xl:px-2xl bottom-[calc(56px+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-[calc(env(safe-area-inset-bottom)+12px)] bg-paper/95 backdrop-blur-md border-t border-moss/5"
    >
      <div class="mx-auto w-full max-w-[1200px] flex gap-xs">
        <UiButton
          variant="ghost"
          :block="true"
          :loading="savingToWishlist"
          @click="onSaveToWishlist"
        >
          <Icon
            :name="inWishlist ? 'lucide:bookmark-check' : 'lucide:bookmark'"
            class="size-4"
            aria-hidden="true"
          />
          {{ inWishlist ? 'En tu wishlist' : 'A mi wishlist' }}
        </UiButton>
        <UiButton
          variant="dark"
          :block="true"
          :loading="duplicating"
          @click="onDuplicate"
        >
          <Icon name="lucide:plus" class="size-4" aria-hidden="true" />
          A mi colección
        </UiButton>
      </div>
    </div>

    <UiShareSheet
      v-if="coffee"
      v-model="shareOpen"
      :entity-name="coffee.name"
      entity-kind="coffee"
      :initial-visibility="coffee.visibility ?? 'private'"
      :initial-shared-with="coffee.sharedWith ?? []"
      :on-save="(visibility, uids) => coffeesStore.updateVisibility(coffee!.id, visibility, uids)"
      @saved="onShareSaved"
    />
  </div>
</template>

<style scoped>
.detail { box-sizing: border-box; max-width: 1180px; padding: 8px 20px 180px; display: flex; flex-direction: column; gap: 16px; }
.desktop-only { display: none !important; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.back { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-left: -12px; padding: 0 12px; border: 0; background: transparent; color: var(--ink); font: 600 15px/20px var(--font-sans); cursor: pointer; }
.back-label { display: none; }
.top-actions { display: flex; align-items: center; gap: 8px; }
.icon-btn { width: 44px; height: 44px; border: 0; border-radius: 12px; background: transparent; color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.small { height: 40px; font-size: 14px; }
.danger { background: transparent; color: var(--danger); }
.danger:hover:not(:disabled) { background: var(--surface); }
.state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 64px 0; }
.state-text { margin: 0; font: italic 400 18px/26px var(--font-display); color: var(--ink-soft); }
.layout { display: flex; flex-direction: column; gap: 24px; }
.main { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
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
.roaster { margin: 4px 0 0; font: italic 400 17px/22px var(--font-display); }
.score { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.score-num { font: 400 56px/0.9 var(--font-display); letter-spacing: -0.02em; color: var(--primary); }
.score-dec { font-size: 28px; }
.score-lab { font: 600 12px/16px var(--font-sans); }
.score-sub { font-size: 12px; line-height: 16px; }
.notes { display: flex; flex-wrap: wrap; gap: 6px; }
.note { background: color-mix(in srgb, var(--bg) 70%, transparent); }
.note { display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border-radius: 9999px; font: 500 13px/16px var(--font-sans); }
.cta-bar { position: fixed; left: 0; right: 0; z-index: 20; bottom: calc(56px + env(safe-area-inset-bottom)); padding: 12px 20px; background: color-mix(in srgb, var(--bg) 95%, transparent); border-top: 1px solid var(--line); }
.cta-bar--pair { display: flex; gap: 10px; }
.cta-bar--pair .v3-btn { flex: 1; }
.cta { display: flex; align-items: center; justify-content: space-between; gap: 12px; height: 56px; padding: 0 20px; border-radius: 14px; background: var(--primary); color: var(--on-primary); text-decoration: none; }
.cta:hover { background: var(--primary-pressed); }
.cta-main { display: flex; align-items: center; gap: 10px; font: 600 16px/20px var(--font-sans); }
.cta-meta { font: 400 13px/16px var(--font-sans); opacity: 0.85; }
.tastings { display: flex; flex-direction: column; gap: 12px; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.section-title { margin: 0; font: 400 24px/28px var(--font-display); }
.tasting-list { display: flex; flex-direction: column; padding: 4px 14px; border-radius: 16px; background: var(--surface); }
.tasting { display: flex; align-items: center; gap: 14px; min-height: 68px; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--line); }
.tasting:last-child { border-bottom: 0; }
.t-score { flex: none; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font: 400 20px/1 var(--font-display); background: var(--surface-strong); }
.t-score.tone-high { background: var(--accent); color: var(--on-accent); }
.t-score.tone-good { background: var(--tint); color: var(--on-tint); }
.t-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.t-method { font: 400 19px/22px var(--font-display); }
.t-chevron { flex: none; color: var(--ink-soft); }
.specs { display: flex; flex-direction: column; }
.specs-title { margin: 0 0 6px; color: var(--ink-soft); }
.spec-list { margin: 0; }
.spec { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.spec dt { font: 400 15px/22px var(--font-sans); color: var(--ink-soft); }
.spec dd { margin: 0; text-align: right; font: 500 15px/22px var(--font-sans); overflow-wrap: break-word; hyphens: auto; }
.menu { display: flex; flex-direction: column; padding: 4px 12px calc(20px + env(safe-area-inset-bottom)); }
.menu-item { display: flex; align-items: center; gap: 14px; min-height: 56px; padding: 0 12px; border: 0; border-radius: 12px; background: transparent; color: var(--ink); font: 500 16px/22px var(--font-sans); cursor: pointer; }
.menu-item:hover { background: var(--surface); }
.menu-item--danger { color: var(--danger); }

@media (min-width: 1024px) {
  .detail { padding: 24px 48px 64px; gap: 24px; }
  .mobile-only { display: none !important; }
  .desktop-only { display: inline-flex !important; }
  .back-label { display: inline; }
  .layout { flex-direction: row; align-items: flex-start; gap: 40px; }
  .main { flex: 3 1 440px; }
  .specs { flex: 2 1 300px; min-width: 0; padding: 24px; border-radius: 18px; box-shadow: inset 0 0 0 1px var(--line); }
  .hero { border-radius: 32px; }
  .blob { right: -120px; top: -160px; width: 480px; height: 480px; }
  .hero-in { padding: 32px 32px 28px; gap: 20px; }
  .name { font-size: 80px; line-height: 0.92; }
  .roaster { font-size: 22px; line-height: 28px; }
  .score-num { font-size: 96px; line-height: 0.85; }
  .score-dec { font-size: 44px; }
  .note { height: 34px; padding: 0 14px; font-size: 14px; }
  .cta-bar { position: static; padding: 0; background: transparent; border: 0; }
  .section-title { font-size: 28px; line-height: 32px; }
}
</style>

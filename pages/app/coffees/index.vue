<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Coffee } from '~/types'

const { currentUser } = useAuth()
const coffeesStore = useCoffeesStore()
const view = useCoffeeViewStore()

// `ready` evita el flash del empty state mientras la lista aún carga.
const ready = ref(false)

onMounted(async () => {
  coffeesStore.loadShared().catch(() => {})
  try {
    await coffeesStore.loadAll()
  }
  finally {
    ready.value = true
  }
})

// Pull-to-refresh: recarga ambas listas (propios + compartidos) en paralelo
async function refresh() {
  await Promise.all([
    coffeesStore.loadAll(),
    coffeesStore.loadShared().catch(() => {}),
  ])
}

const tab = ref<'mine' | 'shared'>('mine')
const search = ref('')

const mineCount = computed(() => coffeesStore.list.length)
const sharedCount = computed(() => coffeesStore.sharedList.length)

const rawItems = computed(() =>
  tab.value === 'mine' ? coffeesStore.list : coffeesStore.sharedList,
)

const items = computed<Coffee[]>(() => {
  const list = [...(rawItems.value as Coffee[])]

  // Search por nombre o marca — case-insensitive substring. Aplica siempre.
  const q = search.value.trim().toLowerCase()
  const searched = q
    ? list.filter(c =>
        (c.name || '').toLowerCase().includes(q)
        || (c.roasterName || '').toLowerCase().includes(q),
      )
    : list

  // Filtros (sólo se aplican a la pestaña Míos; en Compartidos los datos vienen
  // de fuentes que el usuario no posee y filtrarlos rompería la intuición).
  const f = view.state
  const filtered = tab.value === 'mine'
    ? searched.filter((c) => {
        if (f.process && c.process !== f.process) return false
        if (f.variety && !coffeeVarieties(c).includes(f.variety)) return false
        if (f.roasterId && c.roasterId !== f.roasterId) return false
        if (f.country && c.originCountry !== f.country) return false
        return true
      })
    : searched

  switch (f.sortBy) {
    case 'nameAsc':
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      break
    case 'scaDesc':
      filtered.sort((a, b) => (b.scaScore ?? -Infinity) - (a.scaScore ?? -Infinity))
      break
    case 'priceAsc':
      filtered.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
      break
    case 'priceDesc':
      filtered.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity))
      break
    case 'recent':
    default:
      filtered.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0
        const tb = b.createdAt?.toMillis?.() ?? 0
        return tb - ta
      })
      break
  }
  return filtered
})

const userName = computed(() => {
  const u = currentUser.value
  return u?.displayName || u?.email?.split('@')[0] || ''
})

const segments = computed(() => [
  { key: 'mine', label: 'Míos', count: mineCount.value },
  { key: 'shared', label: 'Compartidos', count: sharedCount.value },
])

const isEmpty = computed(() => items.value.length === 0)
const isFilteredEmpty = computed(
  () => isEmpty.value && tab.value === 'mine' && view.hasActiveFilters,
)

const filtersOpen = ref(false)

// ─── Long-press → action sheet ────────────────────────────────────────────
const router = useRouter()
const { confirm } = useConfirm()
const { medium } = useHaptic()

const actionSheetOpen = ref(false)
const actionCoffee = ref<Coffee | null>(null)

function openActions(coffee: Coffee) {
  medium()
  actionCoffee.value = coffee
  actionSheetOpen.value = true
}

function onShare() {
  if (!actionCoffee.value) return
  // El share existente vive en el detail page. Redirigimos al detail con
  // un query hint que abre el sheet automáticamente — pendiente de
  // implementar; por ahora navegamos al detail.
  router.push(`/app/coffees/${actionCoffee.value.id}?action=share`)
}

function onEdit() {
  if (!actionCoffee.value) return
  router.push(`/app/coffees/${actionCoffee.value.id}/edit`)
}

async function onDelete() {
  const coffee = actionCoffee.value
  if (!coffee) return
  const ok = await confirm({
    title: `Eliminar "${coffee.name}"`,
    message: 'Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  await coffeesStore.remove(coffee.id)
}
// ─── Cafés v3 (interruptor «cafes») ───────────────────────────────────────
// Misma lógica de arriba; cambia la presentación y el menú de acciones.
const v3 = useFlag('cafes')
const { getProcessLabel } = useCatalog()
const roastersStore = useRoastersStore()

const VIEW_ICONS = [
  { value: 'detailed', label: 'Detallado', icon: 'lucide:rows-3' },
  { value: 'medium', label: 'Intermedio', icon: 'lucide:layout-grid' },
  { value: 'compact', label: 'Compacto', icon: 'lucide:list' },
] as const

// Filtros activos como chips que se quitan con un toque (escritorio).
const activeFilterChips = computed(() => {
  const f = view.state
  const chips: { key: 'process' | 'variety' | 'roasterId' | 'country', label: string }[] = []
  if (f.process) chips.push({ key: 'process', label: getProcessLabel(f.process) })
  if (f.variety) chips.push({ key: 'variety', label: f.variety })
  if (f.roasterId) chips.push({ key: 'roasterId', label: roastersStore.list.find(r => r.id === f.roasterId)?.name || 'Marca' })
  if (f.country) chips.push({ key: 'country', label: f.country })
  return chips
})

function onActionsKey(e: KeyboardEvent) {
  if (e.key === 'Escape') actionSheetOpen.value = false
}
function runAction(fn: () => void | Promise<void>) {
  actionSheetOpen.value = false
  fn()
}
</script>

<template>
  <UiPullToRefresh :on-refresh="refresh">
    <div v-if="v3" class="v3 coffees">
      <header class="head">
        <div class="head-row">
          <span class="v3-eyebrow head-eb">— Cafés · {{ mineCount }}</span>
          <div class="head-icons">
            <NuxtLink to="/app/wishlist" class="icon-btn" aria-label="Wishlist">
              <Icon name="lucide:bookmark" size="20" />
            </NuxtLink>
            <UiNotificationBell size="sm" />
            <NuxtLink to="/app/settings" class="icon-btn" aria-label="Ajustes de tu cuenta">
              <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="sm" />
            </NuxtLink>
          </div>
        </div>
        <div class="title-row">
          <div class="title-text">
            <h1 class="title">Mi <span class="v3-accent-word">colección</span></h1>
            <p class="v3-subtitle sub">{{ tab === 'shared' ? 'Lo que tus amigos comparten contigo.' : 'Cafés que has descubierto.' }}</p>
          </div>
          <div class="title-actions">
            <NuxtLink to="/app/wishlist" class="v3-btn v3-btn--secondary desktop-only">
              <Icon name="lucide:bookmark" size="18" />Wishlist
            </NuxtLink>
            <NuxtLink to="/app/coffees/new" class="v3-btn v3-btn--primary new-btn">
              <Icon name="lucide:plus" size="18" /><span class="mobile-only">Nuevo</span><span class="desktop-only">Nuevo café</span>
            </NuxtLink>
          </div>
        </div>
      </header>

      <div class="toolbar">
        <div role="tablist" aria-label="Qué cafés ver" class="seg">
          <button
            v-for="sgm in segments"
            :key="sgm.key"
            type="button"
            role="tab"
            :aria-selected="tab === sgm.key"
            :class="['seg-btn', { 'seg-btn--on': tab === sgm.key }]"
            @click="tab = sgm.key as 'mine' | 'shared'"
          >
            {{ sgm.key === 'shared' ? 'Compartidos conmigo' : sgm.label }} · {{ sgm.count }}
          </button>
        </div>
        <div class="search-row">
          <div class="search">
            <Icon name="lucide:search" size="18" class="search-icon" />
            <label for="cf-search" class="sr-only">Buscar café</label>
            <input id="cf-search" v-model="search" type="search" class="v3-input search-input" placeholder="Nombre o marca" autocomplete="off">
          </div>
          <button
            type="button"
            class="filters-btn mobile-only"
            :aria-label="view.activeFilterCount ? `Filtros y vista, ${view.activeFilterCount} activos` : 'Filtros y vista'"
            @click="filtersOpen = true"
          >
            <Icon name="lucide:sliders-horizontal" size="20" />
            <span v-if="view.activeFilterCount" class="badge" aria-hidden="true">{{ view.activeFilterCount }}</span>
          </button>
          <label class="sort desktop-only">
            <span class="v3-meta">Ordenar</span>
            <select v-model="view.state.sortBy" class="sort-select">
              <option value="recent">Más recientes</option>
              <option value="nameAsc">Nombre A–Z</option>
              <option value="scaDesc">SCA más alto</option>
              <option value="priceAsc">Precio menor</option>
              <option value="priceDesc">Precio mayor</option>
            </select>
          </label>
          <div role="group" aria-label="Vista" class="seg desktop-only">
            <button
              v-for="vw in VIEW_ICONS"
              :key="vw.value"
              type="button"
              :aria-pressed="view.state.viewMode === vw.value"
              :aria-label="vw.label"
              :title="vw.label"
              :class="['seg-icon', { 'seg-btn--on': view.state.viewMode === vw.value }]"
              @click="view.state.viewMode = vw.value"
            >
              <Icon :name="vw.icon" size="18" />
            </button>
          </div>
        </div>
        <div v-if="tab === 'mine'" class="filter-row desktop-only">
          <button type="button" class="v3-chip" @click="filtersOpen = true">
            <Icon name="lucide:sliders-horizontal" size="16" />Filtros
          </button>
          <button
            v-for="ch in activeFilterChips"
            :key="ch.key"
            type="button"
            class="v3-chip v3-chip--on"
            :aria-label="`Quitar filtro ${ch.label}`"
            @click="view.state[ch.key] = null"
          >
            {{ ch.label }}<Icon name="lucide:x" size="14" />
          </button>
          <button v-if="activeFilterChips.length" type="button" class="v3-link clear-link" @click="view.clearFilters">Limpiar</button>
        </div>
      </div>

      <div v-if="!ready" class="grid" aria-busy="true">
        <div v-for="n in 4" :key="`skel-${n}`" class="skel">
          <UiSkeleton class="h-3 w-24" />
          <UiSkeleton class="h-7 w-2/3" />
          <UiSkeleton class="h-3 w-32" />
        </div>
      </div>

      <div v-else-if="isEmpty" class="empty">
        <p class="empty-text">
          <template v-if="isFilteredEmpty">Ningún café coincide con los filtros.</template>
          <template v-else-if="search.trim()">Ningún café se llama así.</template>
          <template v-else-if="tab === 'shared'">Aún no te han compartido cafés. Pídele a un amigo que comparta uno.</template>
          <template v-else>El próximo café espera en tu cafetera.</template>
        </p>
        <button v-if="isFilteredEmpty" type="button" class="v3-btn v3-btn--secondary" @click="view.clearFilters">Limpiar filtros</button>
        <NuxtLink v-else-if="tab === 'mine' && !search.trim()" to="/app/coffees/new" class="v3-btn v3-btn--primary">Registra tu primer café</NuxtLink>
      </div>

      <div v-else :class="['grid', `grid--${view.state.viewMode}`]">
        <UiLongPress v-for="c in items" :key="c.id" :on-long-press="() => openActions(c)">
          <V3CoffeeCard :coffee="c" :mode="view.state.viewMode" />
        </UiLongPress>
      </div>

      <V3CoffeeFiltersSheet v-model="filtersOpen" :count="items.length" />

      <Teleport to="body">
        <Transition name="v3-sheet">
          <div v-if="actionSheetOpen && actionCoffee" class="v3 v3-sheet-wrap" @keydown="onActionsKey">
            <div class="v3-sheet-veil" aria-hidden="true" @click="actionSheetOpen = false" />
            <section role="dialog" aria-modal="true" aria-labelledby="cf-actions-title" class="v3-sheet">
              <span class="v3-sheet-handle" aria-hidden="true" />
              <div class="v3-sheet-head">
                <h2 id="cf-actions-title" class="v3-sheet-title">{{ actionCoffee.name }}</h2>
                <button type="button" class="v3-sheet-close" aria-label="Cerrar" @click="actionSheetOpen = false">
                  <Icon name="lucide:x" size="20" />
                </button>
              </div>
              <div class="actions">
                <button type="button" class="action" @click="runAction(onShare)"><Icon name="lucide:share-2" size="20" />Compartir</button>
                <button type="button" class="action" @click="runAction(onEdit)"><Icon name="lucide:pencil" size="20" />Editar</button>
                <button type="button" class="action action--danger" @click="runAction(onDelete)"><Icon name="lucide:trash-2" size="20" />Eliminar</button>
              </div>
            </section>
          </div>
        </Transition>
      </Teleport>
    </div>

    <div v-else class="mx-auto w-full max-w-[1200px] px-md pt-md pb-2xl lg:px-xl xl:px-2xl lg:pt-xl lg:pb-2xl">
    <header class="flex items-center justify-between gap-md">
      <UiEyebrow>Cafés · {{ mineCount }}</UiEyebrow>
      <div class="lg:hidden inline-flex items-center gap-sm">
        <NuxtLink
          to="/app/wishlist"
          class="inline-flex items-center justify-center size-[44px] rounded-pill bg-surface-2 text-moss hover:bg-surface transition-colors"
          aria-label="Wishlist"
        >
          <Icon name="lucide:bookmark" class="size-4" />
        </NuxtLink>
        <UiNotificationBell size="sm" />
        <NuxtLink to="/app/settings" class="inline-flex">
          <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="sm" />
        </NuxtLink>
      </div>
    </header>

    <div class="mt-lg flex items-end justify-between gap-md flex-wrap">
      <div>
        <h1 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[40px] sm:text-[48px] lg:text-[64px]">
          Mi <span class="italic text-olive">colección</span>
        </h1>
        <p class="subtitle-italic mt-xs">
          <template v-if="tab === 'shared'">Lo que tus amigos comparten contigo.</template>
          <template v-else>Cafés que has descubierto.</template>
        </p>
      </div>

      <div class="flex items-center gap-md">
        <UiSegmented v-model="tab" :items="segments" />
        <button
          type="button"
          class="relative inline-flex items-center justify-center size-[44px] rounded-pill text-moss bg-surface-2 hover:bg-surface transition-colors"
          aria-label="Filtros y vista"
          @click="filtersOpen = true"
        >
          <Icon name="lucide:sliders-horizontal" class="size-5" />
          <span
            v-if="view.activeFilterCount > 0"
            aria-hidden="true"
            class="absolute -top-[2px] -right-[2px] inline-flex items-center justify-center min-w-[16px] h-[16px] px-[4px] rounded-pill bg-olive text-paper font-mono text-[10px] leading-none"
          >
            {{ view.activeFilterCount }}
          </span>
        </button>
        <UiButton
          variant="primary"
          :block="false"
          to="/app/coffees/new"
          size="sm"
          class="hidden lg:inline-flex"
        >
          + Nuevo café
        </UiButton>
      </div>
    </div>

    <UiListSearch v-model="search" placeholder="Buscar por nombre o marca…" class="mt-md" />

    <!-- Skeletons mientras carga — evita el flash empty antes de que llegue data. -->
    <div
      v-if="!ready"
      class="mt-lg flex flex-col gap-md lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-md"
      aria-busy="true"
    >
      <div
        v-for="n in 4"
        :key="`skel-${n}`"
        class="relative overflow-hidden rounded-card-lg bg-surface p-md flex flex-col gap-sm"
      >
        <UiSkeleton class="h-3 w-24" />
        <UiSkeleton class="h-7 w-2/3 rounded-card mt-xs" />
        <UiSkeleton class="h-3 w-32" />
        <div class="flex gap-xs mt-xs">
          <UiSkeleton class="h-5 w-16 rounded-pill" />
          <UiSkeleton class="h-5 w-14 rounded-pill" />
          <UiSkeleton class="h-5 w-12 rounded-pill" />
        </div>
        <UiSkeleton class="h-3 w-20 mt-sm" />
      </div>
    </div>

    <!-- Empty state — solo después de que la primera carga termine. -->
    <div v-if="isEmpty && ready" class="mt-2xl flex flex-col items-center gap-lg">
      <div class="w-full max-w-[340px] rounded-card-lg bg-surface px-lg py-2xl text-center">
        <p class="font-display italic text-[16px] text-moss leading-relaxed">
          <template v-if="isFilteredEmpty">
            Ningún café coincide con los filtros activos.
          </template>
          <template v-else-if="tab === 'shared'">
            Aún no te han compartido cafés. Pide a un amigo que comparta uno.
          </template>
          <template v-else>
            "El próximo café espera en tu cafetera."
          </template>
        </p>
      </div>
      <UiButton
        v-if="isFilteredEmpty"
        variant="ghost"
        :block="false"
        @click="view.clearFilters"
      >
        Limpiar filtros
      </UiButton>
      <UiButton
        v-else-if="tab === 'mine'"
        variant="dark"
        :block="false"
        to="/app/coffees/new"
        class="lg:hidden"
      >
        + Registra tu primer café
      </UiButton>
    </div>

    <!-- Grid -->
    <div
      v-else
      class="mt-lg flex flex-col gap-md lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-md"
    >
      <UiLongPress
        v-for="c in items"
        :key="c.id"
        :on-long-press="() => openActions(c)"
      >
        <CoffeeCard
          :coffee="c"
          :mode="view.state.viewMode"
          class="lg:[&_h3]:text-[28px]"
        />
      </UiLongPress>
    </div>

    <!-- Mobile FAB (only when list has items) -->
    <NuxtLink
      v-if="!isEmpty"
      to="/app/coffees/new"
      class="lg:hidden fixed bottom-[96px] right-md z-20 inline-flex size-[56px] items-center justify-center rounded-pill bg-olive text-paper shadow-[0_8px_24px_rgba(47,53,40,0.18)] transition-transform duration-150 ease-sorbo hover:-translate-y-[2px] active:translate-y-0"
      aria-label="Nuevo café"
    >
      <Icon name="lucide:plus" class="size-6" />
    </NuxtLink>

    <CoffeeFiltersSheet v-model="filtersOpen" />

    <!-- Long-press action sheet -->
    <UiCardActionSheet
      v-model="actionSheetOpen"
      :title="actionCoffee?.name || ''"
      subtitle="Café"
      @share="onShare"
      @edit="onEdit"
      @delete="onDelete"
    />
    </div>
  </UiPullToRefresh>
</template>

<style scoped>
.coffees { box-sizing: border-box; max-width: 1180px; padding: 12px 20px 32px; display: flex; flex-direction: column; gap: 20px; background: transparent; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.desktop-only { display: none !important; }
.head { display: flex; flex-direction: column; gap: 14px; }
.head-row { display: flex; align-items: center; justify-content: space-between; }
.head-eb { color: var(--ink-soft); }
.head-icons { display: flex; align-items: center; }
.icon-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.title-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.title-text { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.title { margin: 0; font: 400 38px/35px var(--font-display); letter-spacing: -0.01em; }
.sub { margin: 0; }
.title-actions { display: flex; gap: 8px; flex: none; }
.new-btn { height: 40px; padding: 0 14px; font-size: 13px; gap: 6px; }
.toolbar { display: flex; flex-direction: column; gap: 12px; }
.seg { display: flex; padding: 4px; border-radius: 14px; background: var(--surface); }
.seg-btn { flex: 1; height: 40px; padding: 0 12px; border: 0; border-radius: 10px; background: transparent; color: var(--ink); font: 500 13px/16px var(--font-sans); cursor: pointer; }
.seg-btn--on { background: var(--bg); font-weight: 600; }
.seg-icon { width: 40px; height: 40px; border: 0; border-radius: 10px; background: transparent; color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.search-row { display: flex; gap: 8px; align-items: center; }
.search { position: relative; flex: 1; min-width: 0; }
.search-icon { position: absolute; left: 14px; top: 15px; color: var(--ink-soft); }
.search-input { padding-left: 42px; }
.filters-btn { position: relative; flex: none; width: 48px; height: 48px; border: 0; border-radius: 12px; background: var(--surface); color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.badge { position: absolute; top: 6px; right: 6px; min-width: 18px; height: 18px; padding: 0 4px; box-sizing: border-box; border-radius: 9999px; background: var(--primary); color: var(--on-primary); display: flex; align-items: center; justify-content: center; font: 600 11px/1 var(--font-sans); }
.sort { align-items: center; gap: 8px; }
.sort-select { height: 48px; border: 0; border-radius: 12px; background: var(--surface); padding: 0 12px; font: 500 14px/18px var(--font-sans); color: var(--ink); }
.filter-row { flex-wrap: wrap; align-items: center; gap: 8px; }
.clear-link { min-height: 36px; border: 0; background: transparent; font-size: 14px; cursor: pointer; }
.grid { display: flex; flex-direction: column; gap: 12px; }
.skel { display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 24px; background: var(--surface); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 0; text-align: center; }
.empty-text { margin: 0; max-width: 320px; font: italic 400 18px/26px var(--font-display); color: var(--ink-soft); }
.actions { display: flex; flex-direction: column; padding: 4px 12px calc(20px + env(safe-area-inset-bottom)); }
.action { display: flex; align-items: center; gap: 14px; min-height: 56px; padding: 0 12px; border: 0; border-radius: 12px; background: transparent; color: var(--ink); font: 500 16px/22px var(--font-sans); cursor: pointer; }
.action:hover { background: var(--surface); }
.action--danger { color: var(--danger); }

@media (min-width: 1024px) {
  .coffees { padding: 40px 48px 64px; gap: 24px; }
  .mobile-only, .head-row { display: none !important; }
  .desktop-only { display: flex !important; }
  .title { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .sub { font-size: 19px; line-height: 26px; }
  .new-btn { height: 48px; padding: 0 18px; font-size: 15px; gap: 8px; }
  .toolbar { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 12px; }
  .toolbar > .seg { flex: none; }
  .seg-btn { flex: none; padding: 0 16px; font-size: 14px; }
  .search-row { flex: 1 1 560px; gap: 12px; }
  .filter-row { flex-basis: 100%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
  .grid--compact { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
}
</style>

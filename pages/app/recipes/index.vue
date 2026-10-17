<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Recipe } from '~/types'

const { currentUser } = useAuth()
const recipesStore = useRecipesStore()
const { getBrewMethodLabel } = useCatalog()

// `ready` evita el flash del empty state mientras la lista aún carga.
const ready = ref(false)

onMounted(async () => {
  recipesStore.loadShared().catch(() => {})
  try {
    await recipesStore.loadAll()
  }
  finally {
    ready.value = true
  }
})

async function refresh() {
  await Promise.all([
    recipesStore.loadAll(),
    recipesStore.loadShared().catch(() => {}),
  ])
}

const userName = computed(() =>
  currentUser.value?.displayName || currentUser.value?.email?.split('@')[0] || '',
)

const tab = ref<'mine' | 'shared'>('mine')
const search = ref('')

const mineCount = computed(() => recipesStore.list.length)
const sharedCount = computed(() => recipesStore.sharedList.length)

const segments = computed(() => [
  { key: 'mine', label: 'Mías', count: mineCount.value },
  { key: 'shared', label: 'Compartidas', count: sharedCount.value },
])

const items = computed<Recipe[]>(() => {
  const source = tab.value === 'mine'
    ? (recipesStore.list as Recipe[])
    : (recipesStore.sharedList as Recipe[])
  const q = search.value.trim().toLowerCase()
  const searched = q
    ? (source || []).filter(r =>
        (r.name || '').toLowerCase().includes(q)
        || (r.author || '').toLowerCase().includes(q)
        || getBrewMethodLabel(r.brewMethod).toLowerCase().includes(q),
      )
    : (source || [])
  return [...searched].sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0
    const tb = b.createdAt?.toMillis?.() ?? 0
    return tb - ta
  })
})

const isEmpty = computed(() => items.value.length === 0)

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function durationLabel(r: Recipe): string {
  if (!r.steps || r.steps.length === 0) return '—'
  const max = r.steps.reduce((acc, s) => Math.max(acc, s.timeSeconds), 0)
  return formatTime(max)
}

function methodPill(r: Recipe): string {
  return getBrewMethodLabel(r.brewMethod)
}

// "Desconocido" es el placeholder cuando no se especifica autor — no lo tratamos
// como autor real para evitar mostrarlo en italic-olive como si fuese una firma.
function realAuthor(r: Recipe): string | null {
  const a = r.author?.trim()
  if (!a || a.toLowerCase() === 'desconocido') return null
  return a
}

function rowEyebrow(r: Recipe): string {
  const method = methodPill(r).toUpperCase()
  const author = realAuthor(r)
  if (author) return `${method} · ${author.toUpperCase()}`
  return method
}

function recipeName(r: Recipe): string {
  // If recipe name == "{Method} {Author}", split for visual emphasis.
  // Otherwise just display the name.
  return r.name.endsWith('.') ? r.name.slice(0, -1) : r.name
}

// Sheet detail
const sheetOpen = ref(false)
const activeRecipe = ref<Recipe | null>(null)

function openSheet(r: Recipe) {
  activeRecipe.value = r
  sheetOpen.value = true
}

// Recetas v3 (interruptor «recetas»): misma lógica; tocar una receta abre el detalle.
const v3 = useFlag('recetas')
</script>

<template>
  <UiPullToRefresh :on-refresh="refresh">
    <div v-if="v3" class="v3 recipes">
      <header class="head">
        <div class="head-row">
          <span class="v3-eyebrow head-eb">— Recetas · {{ mineCount }}</span>
          <div class="head-icons">
            <UiNotificationBell size="sm" />
            <NuxtLink to="/app/settings" class="icon-btn" aria-label="Ajustes de tu cuenta">
              <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="sm" />
            </NuxtLink>
          </div>
        </div>
        <div class="title-row">
          <div class="title-text">
            <h1 class="title">Tus <span class="v3-accent-word">recetas</span></h1>
            <p class="v3-subtitle sub">
              {{ tab === 'shared' ? 'Lo que tus amigos comparten.' : items.length ? 'Tus brews favoritos.' : 'Tu próximo brew empieza aquí.' }}
            </p>
          </div>
          <NuxtLink to="/app/recipes/new" class="v3-btn v3-btn--primary new-btn">
            <Icon name="lucide:plus" size="18" /><span class="mobile-only">Nueva</span><span class="desktop-only">Nueva receta</span>
          </NuxtLink>
        </div>
      </header>

      <div class="toolbar">
        <div role="tablist" aria-label="Qué recetas ver" class="seg">
          <button
            v-for="sgm in segments"
            :key="sgm.key"
            type="button"
            role="tab"
            :aria-selected="tab === sgm.key"
            :class="['seg-btn', { 'seg-btn--on': tab === sgm.key }]"
            @click="tab = sgm.key as 'mine' | 'shared'"
          >
            {{ sgm.key === 'shared' ? 'Compartidas conmigo' : sgm.label }} · {{ sgm.count }}
          </button>
        </div>
        <div class="search">
          <Icon name="lucide:search" size="18" class="search-icon" />
          <label for="rc-search" class="sr-only">Buscar receta</label>
          <input id="rc-search" v-model="search" type="search" class="v3-input search-input" placeholder="Nombre, autor o método" autocomplete="off">
        </div>
      </div>

      <div v-if="!ready" class="grid" aria-busy="true">
        <div v-for="n in 3" :key="`skel-${n}`" class="skel">
          <UiSkeleton class="h-3 w-24" />
          <UiSkeleton class="h-7 w-2/3" />
          <UiSkeleton class="h-3 w-32" />
        </div>
      </div>

      <div v-else-if="isEmpty" class="empty">
        <p class="empty-text">
          <template v-if="search.trim()">Ninguna receta coincide con tu búsqueda.</template>
          <template v-else-if="tab === 'shared'">Aún no te han compartido recetas. Pídele a un amigo que comparta una.</template>
          <template v-else>Una buena receta es repetir el sorbo perfecto.</template>
        </p>
        <NuxtLink v-if="tab === 'mine' && !search.trim()" to="/app/recipes/new" class="v3-btn v3-btn--primary">Registra tu primera receta</NuxtLink>
      </div>

      <div v-else class="grid">
        <V3RecipeCard v-for="r in items" :key="r.id" :recipe="r" />
      </div>
    </div>

    <div v-else class="mx-auto w-full max-w-[1200px] px-md pt-md pb-2xl lg:px-xl xl:px-2xl lg:pt-xl">
    <header class="flex items-center justify-between gap-md">
      <UiEyebrow>Recetas · {{ mineCount }}</UiEyebrow>
      <div class="lg:hidden inline-flex items-center gap-sm">
        <UiNotificationBell size="sm" />
        <NuxtLink to="/app/settings" class="inline-flex">
          <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="sm" />
        </NuxtLink>
      </div>
    </header>

    <div class="mt-lg flex items-end justify-between gap-md flex-wrap">
      <div>
        <h1 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[40px] sm:text-[48px] lg:text-[64px]">
          Tus <span class="italic text-olive">recetas</span>
        </h1>
        <p class="subtitle-italic mt-xs">
          <template v-if="tab === 'shared'">Lo que tus amigos comparten.</template>
          <template v-else-if="items.length > 0">Tus brews favoritos.</template>
          <template v-else>Tu próximo brew empieza aquí.</template>
        </p>
      </div>
      <div class="flex items-center gap-md">
        <UiSegmented v-model="tab" :items="segments" />
        <UiButton
          variant="primary"
          :block="false"
          to="/app/recipes/new"
          size="sm"
          class="hidden lg:inline-flex"
        >
          + Nueva receta
        </UiButton>
      </div>
    </div>

    <UiListSearch v-model="search" placeholder="Buscar por nombre, autor o método…" class="mt-md" />

    <!-- Empty — solo después de la primera carga. -->
    <!-- Skeletons mientras carga -->
    <div
      v-if="!ready"
      class="mt-lg flex flex-col gap-sm lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-md"
      aria-busy="true"
    >
      <div
        v-for="n in 3"
        :key="`skel-${n}`"
        class="rounded-card-lg bg-surface p-md flex flex-col gap-xs"
      >
        <div class="flex items-start justify-between gap-md">
          <UiSkeleton class="h-3 w-24" />
          <UiSkeleton class="h-5 w-12 rounded-pill" />
        </div>
        <UiSkeleton class="h-7 w-1/2 rounded-card mt-xxs" />
        <div class="grid grid-cols-3 gap-md mt-sm">
          <div class="flex flex-col gap-xxs">
            <UiSkeleton class="h-3 w-12" />
            <UiSkeleton class="h-4 w-10" />
          </div>
          <div class="flex flex-col gap-xxs">
            <UiSkeleton class="h-3 w-12" />
            <UiSkeleton class="h-4 w-10" />
          </div>
          <div class="flex flex-col gap-xxs">
            <UiSkeleton class="h-3 w-12" />
            <UiSkeleton class="h-4 w-10" />
          </div>
        </div>
      </div>
    </div>

    <div v-if="isEmpty && ready" class="mt-2xl flex flex-col items-center gap-lg">
      <div class="w-full max-w-[340px] rounded-card-lg bg-surface px-lg py-2xl text-center">
        <p class="font-display italic text-[16px] text-moss leading-relaxed">
          <template v-if="tab === 'shared'">
            Aún no te han compartido recetas. Pide a un amigo que comparta una.
          </template>
          <template v-else>
            "Una buena receta es repetir el sorbo perfecto."
          </template>
        </p>
      </div>
      <UiButton
        v-if="tab === 'mine'"
        variant="dark"
        :block="false"
        to="/app/recipes/new"
        class="lg:hidden"
      >
        + Registra tu primera receta
      </UiButton>
    </div>

    <!-- List — todas las cards usan el mismo estilo light surface. Los specs
         (dosis/ratio/temp/bestFor) se muestran solo si existen, evitando el
         contraste visual fuerte que teníamos entre featured dark vs compact light. -->
    <div v-else class="mt-lg flex flex-col gap-sm lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-md">
      <button
        v-for="r in items"
        :key="r.id"
        type="button"
        class="w-full rounded-card-lg bg-surface p-md text-left transition-colors duration-150 ease-sorbo hover:bg-surface-2"
        @click="openSheet(r)"
      >
        <div class="flex items-start justify-between gap-md">
          <UiEyebrow>{{ rowEyebrow(r) }}</UiEyebrow>
          <UiChip v-if="r.brewMethod" variant="default" compact class="!h-[22px]">
            {{ methodPill(r).toUpperCase() }}
          </UiChip>
        </div>

        <div class="mt-xs font-display tracking-[-0.01em] leading-[1.05] text-[26px] sm:text-[28px] text-moss truncate">
          <template v-if="realAuthor(r)">
            {{ getBrewMethodLabel(r.brewMethod) }} <span class="italic text-olive">{{ realAuthor(r) }}</span>
          </template>
          <template v-else>
            {{ recipeName(r) }}
          </template>
        </div>

        <!-- Specs row — solo si al menos uno existe -->
        <div v-if="r.dose || r.ratio || r.water || r.waterTemp" class="mt-md grid grid-cols-3 gap-md">
          <div v-if="r.dose" class="flex flex-col gap-xxs">
            <UiEyebrow>Dosis</UiEyebrow>
            <span class="font-mono text-[13px] text-moss">{{ r.dose }}g</span>
          </div>
          <div v-if="r.ratio || (r.water && r.dose)" class="flex flex-col gap-xxs">
            <UiEyebrow>Ratio</UiEyebrow>
            <span class="font-mono text-[13px] text-olive">
              {{ r.ratio || `1:${Math.round(r.water / r.dose)}` }}
            </span>
          </div>
          <div v-if="r.waterTemp" class="flex flex-col gap-xxs">
            <UiEyebrow>Temp</UiEyebrow>
            <span class="font-mono text-[13px] text-moss">{{ r.waterTemp }}°</span>
          </div>
        </div>

        <!-- Duración compacta cuando no hay specs (recetas incompletas) -->
        <div v-else class="mt-xs">
          <span class="font-mono text-[12px] text-moss-soft tabular-nums">
            {{ durationLabel(r) }}
          </span>
        </div>

        <p v-if="r.bestFor" class="mt-md font-display italic text-[14px] text-moss-soft leading-relaxed line-clamp-2">
          "{{ r.bestFor }}"
        </p>
      </button>
    </div>

    <!-- Mobile FAB (only when list has items) -->
    <NuxtLink
      v-if="!isEmpty"
      to="/app/recipes/new"
      class="lg:hidden fixed bottom-[96px] right-md z-20 inline-flex size-[56px] items-center justify-center rounded-pill bg-olive text-paper shadow-[0_8px_24px_rgba(47,53,40,0.18)] transition-transform duration-150 ease-sorbo hover:-translate-y-[2px] active:translate-y-0"
      aria-label="Nueva receta"
    >
      <Icon name="lucide:plus" class="size-6" />
    </NuxtLink>

    <!-- Detail sheet -->
    <UiBottomSheet v-model="sheetOpen">
      <RecipeDetail v-if="activeRecipe" :recipe="activeRecipe" />
      <div v-if="activeRecipe" class="mt-lg">
        <UiButton
          variant="primary"
          :to="`/app/recipes/${activeRecipe.id}`"
          @click="sheetOpen = false"
        >
          Ver completa
        </UiButton>
      </div>
    </UiBottomSheet>
    </div>
  </UiPullToRefresh>
</template>

<style scoped>
.recipes { box-sizing: border-box; max-width: 1180px; padding: 12px 20px 120px; display: flex; flex-direction: column; gap: 20px; background: transparent; }
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
.new-btn { flex: none; height: 40px; padding: 0 14px; font-size: 13px; gap: 6px; }
.toolbar { display: flex; flex-direction: column; gap: 12px; }
.seg { display: flex; padding: 4px; border-radius: 14px; background: var(--surface); }
.seg-btn { flex: 1; height: 40px; padding: 0 12px; border: 0; border-radius: 10px; background: transparent; color: var(--ink); font: 500 13px/16px var(--font-sans); cursor: pointer; }
.seg-btn--on { background: var(--bg); font-weight: 600; }
.search { position: relative; flex: 1; min-width: 0; }
.search-icon { position: absolute; left: 14px; top: 15px; color: var(--ink-soft); }
.search-input { padding-left: 42px; }
.grid { display: flex; flex-direction: column; gap: 12px; }
.skel { display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 24px; background: var(--surface); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 0; text-align: center; }
.empty-text { margin: 0; max-width: 320px; font: italic 400 18px/26px var(--font-display); color: var(--ink-soft); }

@media (min-width: 1024px) {
  .recipes { padding: 40px 48px 64px; gap: 24px; }
  .mobile-only, .head-row { display: none !important; }
  .desktop-only { display: inline !important; }
  .title { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .sub { font-size: 19px; line-height: 26px; }
  .new-btn { height: 48px; padding: 0 18px; font-size: 15px; gap: 8px; }
  .toolbar { flex-direction: row; align-items: center; }
  .seg { flex: none; }
  .seg-btn { flex: none; padding: 0 16px; font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
}
</style>

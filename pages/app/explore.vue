<script setup lang="ts">
import { computed, onMounted } from 'vue'

const { currentUser } = useAuth()
const wishlistStore = useWishlistStore()
const {
  items,
  filteredItems,
  counts,
  selectedKind,
  loading,
  error,
  loaded,
  load,
} = useCommunityFeed()

onMounted(() => {
  load()
  // La wishlist se usa para marcar/evitar duplicados en las cards de café.
  if (wishlistStore.list.length === 0) wishlistStore.loadAll().catch(() => {})
})

async function refresh() {
  await load()
}

const userName = computed(() =>
  currentUser.value?.displayName || currentUser.value?.email?.split('@')[0] || '',
)

const isEmpty = computed(() => loaded.value && items.value.length === 0)
const noResults = computed(
  () => loaded.value && items.value.length > 0 && filteredItems.value.length === 0,
)

const kindFilters = computed(() => [
  { key: 'all', label: 'Todos', count: counts.value.all },
  { key: 'coffee', label: 'Cafés', count: counts.value.coffee },
  { key: 'tasting', label: 'Catas', count: counts.value.tasting },
  { key: 'recipe', label: 'Recetas', count: counts.value.recipe },
])

// Explora v3 (interruptor «social»).
const v3 = useFlag('social')
</script>

<template>
  <UiPullToRefresh :on-refresh="refresh">
    <div v-if="v3" class="v3 explore">
      <header class="head">
        <div class="head-row">
          <span class="v3-eyebrow head-eb">— Explora</span>
          <div class="head-icons">
            <UiNotificationBell size="sm" />
            <NuxtLink to="/app/settings" class="icon-btn" aria-label="Ajustes de tu cuenta">
              <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="sm" />
            </NuxtLink>
          </div>
        </div>
        <h1 class="title">La <span class="v3-accent-word">comunidad</span></h1>
        <p class="v3-subtitle sub">Cafés, catas y recetas que otros comparten.</p>
      </header>

      <div v-if="!loading && !isEmpty && !error" role="tablist" aria-label="Qué ver" class="seg">
        <button
          v-for="k in kindFilters"
          :key="k.key"
          type="button"
          role="tab"
          :aria-selected="selectedKind === k.key"
          :class="['seg-btn', { 'seg-btn--on': selectedKind === k.key }]"
          @click="selectedKind = k.key as typeof selectedKind"
        >
          {{ k.key === 'all' ? 'Todo' : k.label }} · {{ k.count }}
        </button>
      </div>

      <div v-if="loading" class="feed" aria-busy="true">
        <div v-for="n in 3" :key="`skel-${n}`" class="skel">
          <UiSkeleton class="h-8 w-32" />
          <UiSkeleton class="h-7 w-2/3" />
          <UiSkeleton class="h-3 w-1/2" />
        </div>
      </div>

      <div v-else-if="error" class="empty">
        <p class="empty-text">{{ error }}</p>
        <button type="button" class="v3-btn v3-btn--secondary" @click="load">Reintentar</button>
      </div>

      <div v-else-if="isEmpty" class="empty">
        <p class="empty-text">Aún no hay nada en la comunidad. Comparte un café con «Comunidad» y sé el primero.</p>
        <NuxtLink to="/app/coffees" class="v3-btn v3-btn--primary">Ir a mis cafés</NuxtLink>
      </div>

      <div v-else-if="noResults" class="empty">
        <p class="empty-text">Nada coincide con ese filtro todavía.</p>
        <button type="button" class="v3-btn v3-btn--secondary" @click="selectedKind = 'all'">Ver todo</button>
      </div>

      <div v-else class="feed">
        <V3FeedCard v-for="item in filteredItems" :key="`${item.kind}-${item.id}`" :item="item" class="feed-item" />
      </div>
    </div>

    <div v-else class="mx-auto w-full max-w-[1200px] px-md pt-md pb-2xl lg:px-xl xl:px-2xl lg:pt-xl">
    <header class="flex items-center justify-between gap-md">
      <UiEyebrow>Explora</UiEyebrow>
      <div class="lg:hidden inline-flex items-center gap-sm">
        <UiNotificationBell size="sm" />
        <NuxtLink to="/app/settings" class="inline-flex">
          <UiAvatar :name="userName" :src="currentUser?.photoURL ?? undefined" size="sm" />
        </NuxtLink>
      </div>
    </header>

    <div class="mt-lg">
      <h1 class="font-display tracking-[-0.02em] leading-[1.05] text-moss text-[40px] sm:text-[48px] lg:text-[64px]">
        La <span class="italic text-olive">comunidad</span>
      </h1>
      <p class="subtitle-italic mt-xs">
        Cafés, catas y recetas que otros sorbos comparten.
      </p>
    </div>

    <!-- Filtro por tipo (oculto mientras carga o si todo está vacío) -->
    <div v-if="!loading && !isEmpty && !error" class="mt-lg overflow-x-auto -mx-md px-md lg:mx-0 lg:px-0">
      <UiSegmented v-model="selectedKind" :items="kindFilters" />
    </div>

    <!-- Skeletons mientras carga -->
    <div
      v-if="loading"
      class="mt-lg grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-md"
      aria-busy="true"
    >
      <div
        v-for="n in 4"
        :key="`skel-${n}`"
        class="rounded-card-lg bg-surface p-md flex flex-col gap-sm"
      >
        <!-- Author header -->
        <div class="flex items-center gap-sm">
          <UiSkeleton class="size-8 rounded-pill" />
          <div class="flex-1 flex flex-col gap-xs">
            <UiSkeleton class="h-3 w-24" />
            <UiSkeleton class="h-3 w-32" />
          </div>
        </div>
        <UiSkeleton class="h-3 w-28 mt-sm" />
        <UiSkeleton class="h-6 w-2/3 rounded-card" />
        <UiSkeleton class="h-3 w-1/2" />
        <div class="flex gap-xs mt-xs">
          <UiSkeleton class="h-5 w-16 rounded-pill" />
          <UiSkeleton class="h-5 w-14 rounded-pill" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="mt-2xl flex flex-col items-center gap-lg">
      <div class="w-full max-w-[360px] rounded-card-lg bg-surface px-lg py-xl text-center">
        <p class="font-display italic text-[15px] text-moss leading-relaxed">
          {{ error }}
        </p>
      </div>
      <UiButton variant="ghost" :block="false" @click="load">
        Reintentar
      </UiButton>
    </div>

    <!-- Empty -->
    <div v-else-if="isEmpty" class="mt-2xl flex flex-col items-center gap-lg">
      <div class="w-full max-w-[360px] rounded-card-lg bg-surface px-lg py-2xl text-center">
        <p class="font-display italic text-[16px] text-moss leading-relaxed">
          "Aún no hay sorbos en la comunidad. Comparte un café como Comunidad y serás el primero."
        </p>
      </div>
      <UiButton variant="dark" :block="false" to="/app/coffees">
        Ir a mis cafés
      </UiButton>
    </div>

    <!-- Sin resultados con el filtro activo -->
    <div v-else-if="noResults" class="mt-2xl flex flex-col items-center gap-lg">
      <div class="w-full max-w-[360px] rounded-card-lg bg-surface px-lg py-xl text-center">
        <p class="font-display italic text-[15px] text-moss leading-relaxed">
          Nada coincide con ese filtro todavía.
        </p>
      </div>
      <UiButton variant="ghost" :block="false" @click="selectedKind = 'all'">
        Ver todo
      </UiButton>
    </div>

    <!-- Feed -->
    <div
      v-else
      class="mt-lg flex flex-col gap-md lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-md"
    >
      <ExploreCard
        v-for="item in filteredItems"
        :key="`${item.kind}-${item.id}`"
        :item="item"
      />
    </div>
    </div>
  </UiPullToRefresh>
</template>

<style scoped>
.explore { box-sizing: border-box; max-width: 1180px; padding: 12px 20px 120px; display: flex; flex-direction: column; gap: 20px; background: transparent; }
.head { display: flex; flex-direction: column; gap: 6px; }
.head-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.head-eb { color: var(--ink-soft); }
.head-icons { display: flex; align-items: center; }
.icon-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.title { margin: 0; font: 400 38px/35px var(--font-display); letter-spacing: -0.01em; }
.sub { margin: 0; }
.seg { display: flex; padding: 4px; border-radius: 14px; background: var(--surface); overflow-x: auto; }
.seg-btn { flex: 1; height: 40px; padding: 0 12px; border: 0; border-radius: 10px; background: transparent; color: var(--ink); font: 500 13px/16px var(--font-sans); white-space: nowrap; cursor: pointer; }
.seg-btn--on { background: var(--bg); font-weight: 600; }
.feed { display: flex; flex-direction: column; gap: 12px; }
.skel { display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 24px; background: var(--surface); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px 0; text-align: center; }
.empty-text { margin: 0; max-width: 340px; font: italic 400 18px/26px var(--font-display); color: var(--ink-soft); }

@media (min-width: 1024px) {
  .explore { padding: 40px 48px 64px; gap: 24px; }
  .head-row { display: none; }
  .title { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .sub { font-size: 19px; line-height: 26px; }
  .seg { align-self: flex-start; }
  .seg-btn { flex: none; padding: 0 16px; font-size: 14px; }
  /* Columnas que se acomodan al alto de cada tarjeta. */
  .feed { display: block; columns: 3 320px; column-gap: 16px; }
  .feed-item { break-inside: avoid; margin-bottom: 16px; }
  .skel { break-inside: avoid; margin-bottom: 16px; }
}
</style>

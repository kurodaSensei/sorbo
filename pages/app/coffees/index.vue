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
        if (f.variety && c.variety !== f.variety) return false
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
</script>

<template>
  <UiPullToRefresh :on-refresh="refresh">
    <div class="mx-auto w-full max-w-[1200px] px-md pt-md pb-2xl lg:px-xl xl:px-2xl lg:pt-xl lg:pb-2xl">
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

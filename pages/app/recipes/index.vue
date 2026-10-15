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
</script>

<template>
  <UiPullToRefresh :on-refresh="refresh">
    <div class="mx-auto w-full max-w-[1200px] px-md pt-md pb-2xl lg:px-xl xl:px-2xl lg:pt-xl">
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

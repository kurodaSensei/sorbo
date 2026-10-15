<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FeedItem } from '~/composables/useCommunityFeed'
import type { Coffee, Recipe, Tasting } from '~/types'

const props = defineProps<{ item: FeedItem }>()

const { getBrewMethodLabel } = useCatalog()
const wishlistStore = useWishlistStore()
const coffeesStore = useCoffeesStore()
const recipesStore = useRecipesStore()
const { trackEvent } = useAnalytics()

const KIND_LABEL: Record<FeedItem['kind'], string> = {
  coffee: 'Café',
  tasting: 'Cata',
  recipe: 'Receta',
}

const detailLink = computed(() => {
  switch (props.item.kind) {
    case 'coffee': return `/app/coffees/${props.item.id}`
    case 'tasting': return `/app/tastings/${props.item.id}`
    case 'recipe': return `/app/recipes/${props.item.id}`
  }
})

const authorName = computed(() => props.item.data.authorName || 'Alguien')
const authorPhoto = computed(() => props.item.data.authorPhotoURL || undefined)

const relativeDate = computed(() => {
  const ms = props.item.createdAtMs
  if (!ms) return ''
  const diffH = (Date.now() - ms) / 1000 / 3600
  if (diffH < 1) return 'hace un momento'
  if (diffH < 24) return `hace ${Math.round(diffH)} h`
  const diffD = diffH / 24
  if (diffD < 7) return `hace ${Math.round(diffD)} d`
  const d = new Date(ms)
  const day = d.getDate()
  const month = new Intl.DateTimeFormat('es', { month: 'short' }).format(d).replace('.', '').toUpperCase()
  return `${day} ${month}`
})

function clean(n?: string): string {
  return (n || '').trim().replace(/\.+$/, '')
}

const PROCESS_LABEL: Record<string, string> = {
  washed: 'Lavado',
  natural: 'Natural',
  honey: 'Honey',
  anaerobic: 'Anaeróbico',
  carbonic: 'Carbónico',
  experimental: 'Experimental',
  other: '',
}

// ── Vistas por tipo ──────────────────────────────────────────────────────────
const coffee = computed(() => props.item.kind === 'coffee' ? props.item.data as Coffee : null)
const tasting = computed(() => props.item.kind === 'tasting' ? props.item.data as Tasting : null)
const recipe = computed(() => props.item.kind === 'recipe' ? props.item.data as Recipe : null)

// ── Acciones en la card ──────────────────────────────────────────────────────
const inWishlist = computed(() => {
  if (!coffee.value) return false
  return !!wishlistStore.findMatchingItem(coffee.value)
})

const savingToWishlist = ref(false)
async function onSaveToWishlist() {
  if (!coffee.value || savingToWishlist.value) return
  savingToWishlist.value = true
  try {
    const result = await wishlistStore.addFromCoffee(coffee.value)
    // Solo trackeamos cuando realmente se añadió algo nuevo (no duplicado).
    if (result.added) {
      trackEvent('explore_save_to_wishlist', { from: 'explore_feed' })
    }
  }
  finally {
    savingToWishlist.value = false
  }
}

const duplicating = ref(false)
async function onDuplicate() {
  if (duplicating.value) return
  duplicating.value = true
  try {
    if (coffee.value) {
      const id = await coffeesStore.duplicate(coffee.value)
      if (id) trackEvent('explore_duplicate', { entity: 'coffee' })
    }
    else if (recipe.value) {
      const id = await recipesStore.duplicate(recipe.value)
      if (id) trackEvent('explore_duplicate', { entity: 'recipe' })
    }
  }
  finally {
    duplicating.value = false
  }
}

const coffeeEyebrow = computed(() => {
  const c = coffee.value
  if (!c) return ''
  const proc = c.process ? PROCESS_LABEL[c.process] || '' : ''
  return [proc, c.originRegion].filter(Boolean).join(' · ')
})

// Acento de borde izquierdo por tipo — permite escanear el feed de un vistazo.
// Implementado con inset box-shadow para que respete border-radius (un border-left
// regular cortaría los corners redondeados).
const accentClass = computed(() => {
  switch (props.item.kind) {
    case 'coffee': return 'shadow-[inset_3px_0_0_var(--honey)]'
    case 'tasting': return 'shadow-[inset_3px_0_0_var(--olive)]'
    case 'recipe': return 'shadow-[inset_3px_0_0_var(--terracotta)]'
    default: return ''
  }
})
</script>

<template>
  <NuxtLink
    :to="detailLink"
    :class="[
      'relative block rounded-card-lg bg-surface p-md transition-colors duration-150 ease-sorbo hover:bg-surface-2',
      accentClass,
    ]"
  >
    <!-- Autor -->
    <header class="flex items-center gap-sm">
      <UiAvatar :name="authorName" :src="authorPhoto" size="sm" />
      <div class="flex flex-col min-w-0 flex-1">
        <span class="font-sans text-[13px] font-medium text-moss truncate">{{ authorName }}</span>
        <span class="font-mono text-[10px] uppercase tracking-eyebrow text-moss-soft">
          {{ KIND_LABEL[item.kind] }} · {{ relativeDate }}
        </span>
      </div>
    </header>

    <!-- Café -->
    <div v-if="coffee" class="mt-md">
      <UiEyebrow v-if="coffeeEyebrow">{{ coffeeEyebrow }}</UiEyebrow>
      <h3 class="mt-xxs font-display text-[26px] leading-[1.05] text-moss">
        {{ clean(coffee.name) || 'Sin nombre' }}
      </h3>
      <p v-if="coffee.roasterName" class="font-display italic text-[13px] text-moss-soft">
        de {{ clean(coffee.roasterName) }}
      </p>
      <div v-if="(coffee.flavorNotes || []).length > 0" class="mt-sm flex flex-wrap gap-xxs">
        <UiChip v-for="n in coffee.flavorNotes.slice(0, 3)" :key="n" compact>{{ n }}</UiChip>
      </div>
    </div>

    <!-- Cata -->
    <div v-else-if="tasting" class="mt-md flex items-start justify-between gap-md">
      <div class="min-w-0">
        <UiEyebrow>{{ getBrewMethodLabel(tasting.brewMethod) }}</UiEyebrow>
        <h3 class="mt-xxs font-display text-[26px] leading-[1.05] text-moss truncate">
          {{ clean(tasting.coffeeName) }}
        </h3>
        <p v-if="tasting.personalNotes" class="mt-xxs font-display italic text-[13px] text-moss-soft line-clamp-2">
          "{{ tasting.personalNotes }}"
        </p>
      </div>
      <div class="shrink-0 flex flex-col items-end">
        <span class="font-display text-[28px] leading-none text-olive">
          {{ tasting.ratingOverall?.toFixed(1) }}
        </span>
        <span class="font-mono text-[10px] uppercase tracking-eyebrow text-moss-soft">/10</span>
      </div>
    </div>

    <!-- Receta -->
    <div v-else-if="recipe" class="mt-md">
      <UiEyebrow>{{ getBrewMethodLabel(recipe.brewMethod) }}<template v-if="recipe.author"> · {{ recipe.author }}</template></UiEyebrow>
      <h3 class="mt-xxs font-display text-[26px] leading-[1.05] text-moss">
        {{ clean(recipe.name) }}
      </h3>
      <div class="mt-sm flex gap-lg">
        <div class="flex flex-col">
          <UiEyebrow>Dosis</UiEyebrow>
          <span class="font-mono text-[13px] text-moss">{{ recipe.dose }}g</span>
        </div>
        <div class="flex flex-col">
          <UiEyebrow>Ratio</UiEyebrow>
          <span class="font-mono text-[13px] text-moss">
            {{ recipe.ratio || `1:${Math.round(recipe.water / recipe.dose)}` }}
          </span>
        </div>
      </div>
    </div>

    <!-- Acciones overlay top-right — no se propagan al NuxtLink.
         Posicionadas absolute para no ocupar espacio en el flow y no chocar
         con el TabBar mobile. -->
    <div
      v-if="coffee || recipe"
      class="absolute top-md right-md flex items-center gap-xxs"
    >
      <button
        v-if="coffee"
        type="button"
        class="inline-flex items-center justify-center size-[32px] rounded-pill transition-colors duration-150 ease-sorbo disabled:opacity-50"
        :class="inWishlist
          ? 'bg-honey text-jungle'
          : 'bg-paper/80 backdrop-blur-sm text-moss-soft hover:bg-paper hover:text-moss'"
        :aria-label="inWishlist ? 'Ya en tu wishlist' : 'Guardar a wishlist'"
        :disabled="savingToWishlist"
        @click.stop.prevent="onSaveToWishlist"
      >
        <Icon
          :name="inWishlist ? 'lucide:bookmark-check' : 'lucide:bookmark'"
          class="size-4"
          aria-hidden="true"
        />
      </button>

      <button
        type="button"
        class="inline-flex items-center justify-center size-[32px] rounded-pill bg-paper/80 backdrop-blur-sm text-moss-soft hover:bg-paper hover:text-moss transition-colors duration-150 ease-sorbo disabled:opacity-50"
        :aria-label="coffee ? 'Añadir a mi colección' : 'Añadir a mis recetas'"
        :disabled="duplicating"
        @click.stop.prevent="onDuplicate"
      >
        <Icon name="lucide:plus" class="size-4" aria-hidden="true" />
      </button>
    </div>
  </NuxtLink>
</template>

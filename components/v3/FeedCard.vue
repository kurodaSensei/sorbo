<script setup lang="ts">
// Publicación de Explora v3: autor, el café / la cata / la receta con su tarjeta
// editorial y las acciones con texto (misma lógica que components/explore/Card.vue).
import type { FeedItem } from '~/composables/useCommunityFeed'
import type { Coffee, Recipe, Tasting } from '~/types'

const props = defineProps<{ item: FeedItem }>()

const { getBrewMethodLabel, getProcessLabel } = useCatalog()
const wishlistStore = useWishlistStore()
const coffeesStore = useCoffeesStore()
const recipesStore = useRecipesStore()
const { trackEvent } = useAnalytics()

const KIND_LABEL = { coffee: 'Café', tasting: 'Cata', recipe: 'Receta' } as const

const coffee = computed(() => props.item.kind === 'coffee' ? props.item.data as Coffee : null)
const tasting = computed(() => props.item.kind === 'tasting' ? props.item.data as Tasting : null)
const recipe = computed(() => props.item.kind === 'recipe' ? props.item.data as Recipe : null)

const link = computed(() => ({ coffee: '/app/coffees/', tasting: '/app/tastings/', recipe: '/app/recipes/' })[props.item.kind] + props.item.id)
const author = computed(() => props.item.data.authorName || 'Alguien')
const clean = (n?: string) => (n || '').trim().replace(/\.+$/, '')
const when = computed(() => (props.item.createdAtMs ? formatRelativeDay(new Date(props.item.createdAtMs)) : ''))

const blob = computed(() => {
  if (recipe.value) return methodBlobStyle(recipe.value.brewMethod)
  const process = coffee.value?.process
  if (tasting.value) return { background: 'var(--tint)', opacity: 0.3 }
  switch (process) {
    case 'natural': return { background: 'var(--accent)', opacity: 0.38 }
    case 'washed': case 'experimental': return { background: 'var(--tint)', opacity: 0.42 }
    case 'other': case undefined: return { background: 'var(--surface)', opacity: 1 }
    default: return { background: 'var(--accent)', opacity: 0.26 }
  }
})

const eyebrow = computed(() => {
  if (coffee.value) return [coffee.value.process && coffee.value.process !== 'other' ? getProcessLabel(coffee.value.process) : '', coffee.value.originRegion].filter(Boolean).join(' · ')
  if (tasting.value) return tasting.value.brewMethod && tasting.value.brewMethod !== 'other' ? getBrewMethodLabel(tasting.value.brewMethod) : ''
  if (recipe.value) return [getBrewMethodLabel(recipe.value.brewMethod), recipe.value.author].filter(Boolean).join(' · ')
  return ''
})
const name = computed(() => clean(coffee.value?.name || tasting.value?.coffeeName || recipe.value?.name) || 'Sin nombre')
const sub = computed(() => {
  const r = coffee.value?.roasterName || tasting.value?.roasterName
  return r ? `de ${clean(r)}` : ''
})
const recipeSpecs = computed(() => {
  const r = recipe.value
  if (!r) return []
  return [r.dose ? `${r.dose} g` : '', r.ratio || (r.water && r.dose ? `1:${Math.round(r.water / r.dose)}` : '')].filter(Boolean)
})

// ── Acciones ────────────────────────────────────────────────────────────────
const inWishlist = computed(() => !!coffee.value && !!wishlistStore.findMatchingItem(coffee.value))
const saving = ref(false)
async function onSaveToWishlist() {
  if (!coffee.value || saving.value || inWishlist.value) return
  saving.value = true
  try {
    const result = await wishlistStore.addFromCoffee(coffee.value)
    if (result.added) trackEvent('explore_save_to_wishlist', { from: 'explore_feed' })
  }
  finally {
    saving.value = false
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
</script>

<template>
  <article class="card">
    <span class="blob" :style="blob" aria-hidden="true" />
    <div class="in">
      <header class="author">
        <UiAvatar :name="author" :src="item.data.authorPhotoURL || undefined" size="sm" />
        <span class="author-text">
          <span class="author-name">{{ author }}</span>
          <span class="v3-meta small">{{ KIND_LABEL[item.kind] }}<template v-if="when"> · {{ when }}</template></span>
        </span>
      </header>

      <NuxtLink :to="link" class="main">
        <span class="id">
          <span v-if="eyebrow" class="v3-eyebrow eb">— {{ eyebrow }}</span>
          <span class="name">{{ name }}</span>
          <span v-if="sub" class="sub">{{ sub }}</span>
        </span>
        <span v-if="tasting && ratingToScore(tasting.ratingOverall)" class="side">
          <span :class="['badge', `tone-${scoreTone(tasting.ratingOverall)}`]">{{ ratingToScore(tasting.ratingOverall) }}</span>
          <span class="v3-meta small">{{ scoreWord(tasting.ratingOverall) }}</span>
        </span>
        <span v-else-if="coffee?.scaScore" class="side">
          <span class="big">{{ coffee.scaScore }}</span><span class="v3-meta small">Score SCA</span>
        </span>
      </NuxtLink>

      <p v-if="tasting?.personalNotes" class="note">«{{ tasting.personalNotes }}»</p>
      <div v-if="(coffee?.flavorNotes || []).length || recipeSpecs.length" class="chips">
        <span v-for="n in (coffee?.flavorNotes || []).slice(0, 3)" :key="n" class="chip">{{ n }}</span>
        <span v-for="s in recipeSpecs" :key="s" class="chip mono">{{ s }}</span>
      </div>

      <div v-if="coffee || recipe" class="actions">
        <button
          v-if="coffee"
          type="button"
          :class="['act', { 'act--on': inWishlist }]"
          :aria-pressed="inWishlist"
          :disabled="saving"
          @click="onSaveToWishlist"
        >
          <Icon :name="inWishlist ? 'lucide:bookmark-check' : 'lucide:bookmark'" size="16" />{{ inWishlist ? 'En Quiero probar' : 'Quiero probarlo' }}
        </button>
        <button type="button" class="act act--primary" :disabled="duplicating" @click="onDuplicate">
          <Icon name="lucide:plus" size="16" />{{ coffee ? 'A mi colección' : 'A mis recetas' }}
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.card { position: relative; overflow: hidden; border-radius: 24px; background: var(--surface-strong); color: var(--ink); }
.blob { position: absolute; right: -70px; top: -90px; width: 240px; height: 240px; border-radius: 50%; pointer-events: none; }
.in { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; }
.author { display: flex; align-items: center; gap: 10px; }
.author-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.author-name { font: 600 14px/18px var(--font-sans); }
.small { font-size: 12px; line-height: 16px; }
.main { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; color: var(--ink); text-decoration: none; }
.id { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.eb { color: var(--ink-soft); }
.name { font: 400 26px/1.05 var(--font-display); letter-spacing: -0.01em; overflow-wrap: anywhere; }
.sub { font: italic 400 15px/20px var(--font-display); color: var(--ink-soft); }
.side { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.badge { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font: 400 24px/1 var(--font-display); background: var(--surface); }
.badge.tone-high { background: var(--accent); color: var(--on-accent); }
.badge.tone-good { background: var(--tint); color: var(--on-tint); }
.big { font: 400 30px/1 var(--font-display); }
.note { margin: 0; font: italic 400 15px/22px var(--font-display); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 9999px; background: color-mix(in srgb, var(--bg) 70%, transparent); font: 500 12px/16px var(--font-sans); }
.mono { font-family: var(--font-mono); }
.actions { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--line); }
.act { flex: 1; height: 40px; border: 0; border-radius: 12px; background: color-mix(in srgb, var(--bg) 70%, transparent); color: var(--ink); display: flex; align-items: center; justify-content: center; gap: 6px; font: 600 13px/16px var(--font-sans); cursor: pointer; }
.act:disabled { opacity: 0.6; cursor: default; }
.act--on { background: var(--accent); color: var(--on-accent); }
.act--primary { background: var(--primary); color: var(--on-primary); }
.act--primary:hover:not(:disabled) { background: var(--primary-pressed); }
@media (min-width: 1024px) {
  .blob { right: -80px; top: -110px; width: 280px; height: 280px; }
  .in { padding: 20px 22px; }
}
</style>

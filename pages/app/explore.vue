<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Coffee, Recipe, Tasting, WishlistItem } from '~/types'
import { buildFeed, filterFeed, fromFriends, type FeedFilter, type FeedItem } from '~/utils/feed'

// Amigos v2. Siguiendo: lo que tus amigos comparten contigo o publican.
// Descubrir: notas, cafés y recetas públicas de la comunidad (incluye lo tuyo).

const tastingsStore = useTastingsStore()
const coffeesStore = useCoffeesStore()
const recipesStore = useRecipesStore()
const wishlistStore = useWishlistStore()
const friendsStore = useFriendsStore()
const { getCommunityFeed } = useFirebase()
const { userId } = useAuth()
const { hasCheered, cheerCount, toggle } = useCheers()
const { trackEvent } = useAnalytics()

type Tab = 'following' | 'discover'
const tab = ref<Tab>('following')
const filter = ref<FeedFilter>('all')
const FILTERS: { id: FeedFilter, label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'tasting', label: 'Notas' },
  { id: 'coffee', label: 'Cafés' },
  { id: 'recipe', label: 'Recetas' },
]
const community = ref<{ tasting: Tasting[], coffee: Coffee[], recipe: Recipe[] }>({ tasting: [], coffee: [], recipe: [] })
const shared = ref<{ tasting: Tasting[], coffee: Coffee[], recipe: Recipe[] }>({ tasting: [], coffee: [], recipe: [] })
const savedRecipes = ref<Set<string>>(new Set())
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [, , , t, c, r] = await Promise.all([
      tastingsStore.loadShared(),
      coffeesStore.loadShared(),
      recipesStore.loadShared(),
      getCommunityFeed<Tasting>('tastings'),
      getCommunityFeed<Coffee>('coffees'),
      getCommunityFeed<Recipe>('recipes'),
    ])
    community.value = { tasting: t, coffee: c, recipe: r }
    shared.value = {
      tasting: tastingsStore.sharedList as Tasting[],
      coffee: coffeesStore.sharedList as Coffee[],
      recipe: recipesStore.sharedList as Recipe[],
    }
  }
  catch (e: any) {
    error.value = e?.code === 'failed-precondition'
      ? 'Descubrir necesita un índice de Firestore. Revisa la consola para crearlo.'
      : 'No pudimos cargar el feed. Desliza hacia abajo para reintentar.'
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  if (!wishlistStore.list.length) wishlistStore.loadAll().catch(() => {})
  if (!coffeesStore.list.length) coffeesStore.loadAll().catch(() => {})
  if (!friendsStore.list.length) friendsStore.load().catch(() => {})
})

const friends = computed(() => friendsStore.accepted.map((f) => {
  const u = friendsStore.getOtherUser(f)
  return { uid: u?.uid ?? f.id, name: u?.displayName || u?.email?.split('@')[0] || 'Amigo' }
}))

const discoverItems = computed(() => buildFeed([
  { kind: 'tasting', docs: community.value.tasting },
  { kind: 'coffee', docs: community.value.coffee },
  { kind: 'recipe', docs: community.value.recipe },
], userId.value))

const followingItems = computed(() => {
  const uids = friendsStore.friendUids
  return buildFeed([
    { kind: 'tasting', docs: [...shared.value.tasting, ...fromFriends(community.value.tasting, uids)] },
    { kind: 'coffee', docs: [...shared.value.coffee, ...fromFriends(community.value.coffee, uids)] },
    { kind: 'recipe', docs: [...shared.value.recipe, ...fromFriends(community.value.recipe, uids)] },
  ], userId.value)
})

const list = computed(() => filterFeed(tab.value === 'following' ? followingItems.value : discoverItems.value, filter.value))
const norm = (s?: string) => (s || '').trim().toLowerCase()

function owned(t: Tasting) {
  return (coffeesStore.list as Coffee[]).some(c => norm(c.name) === norm(t.coffeeName))
}

function wished(t: Tasting) {
  return (wishlistStore.list as WishlistItem[]).some(w => norm(w.coffeeName) === norm(t.coffeeName) && norm(w.roasterName) === norm(t.roasterName))
}

async function cheer(t: Tasting) {
  const next = await toggle(t)
  for (const src of [community.value.tasting, shared.value.tasting]) {
    const i = src.findIndex(x => x.id === t.id)
    if (i !== -1) src[i] = next
  }
  if (next !== t) trackEvent('note_cheer', { on: hasCheered(next), tab: tab.value })
}

async function wish(name: string, roasterName?: string) {
  const { added } = await wishlistStore.addFromCoffee({ name, roasterName } as Coffee)
  if (added) trackEvent('note_want_to_try', { tab: tab.value })
}

async function saveRecipe(r: Recipe) {
  if (await recipesStore.duplicate(r)) savedRecipes.value = new Set(savedRecipes.value).add(r.id)
}

const asT = (i: FeedItem) => i.doc as Tasting
const asC = (i: FeedItem) => i.doc as Coffee
const asR = (i: FeedItem) => i.doc as Recipe
</script>

<template>
  <div class="am">
    <header class="am-head">
      <h1 class="am-title">Amigos</h1>
      <NuxtLink to="/app/friends" class="am-icon" aria-label="Mis amigos e invitaciones">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
      </NuxtLink>
    </header>

    <div role="tablist" aria-label="Amigos" class="am-seg">
      <button type="button" role="tab" :aria-selected="tab === 'following'" @click="tab = 'following'">Siguiendo</button>
      <button type="button" role="tab" :aria-selected="tab === 'discover'" @click="tab = 'discover'">Descubrir</button>
    </div>

    <NuxtLink v-if="tab === 'following' && friends.length" to="/app/friends" class="am-friends" aria-label="Mis amigos">
      <span v-for="f in friends" :key="f.uid" class="am-friend">
        <UiAvatar :name="f.name" size="md" />
        <span class="am-fname">{{ f.name }}</span>
      </span>
    </NuxtLink>

    <p v-if="tab === 'discover'" class="am-hint">Lo que la comunidad comparte, y lo tuyo si es público</p>

    <div class="am-chips" role="group" aria-label="Filtro">
      <button v-for="f in FILTERS" :key="f.id" type="button" :aria-pressed="filter === f.id" @click="filter = f.id">{{ f.label }}</button>
    </div>

    <div v-if="loading" class="am-list" aria-busy="true">
      <div v-for="n in 3" :key="n" class="am-skel" />
    </div>

    <p v-else-if="error" class="am-empty">{{ error }}</p>

    <div v-else class="am-list">
      <template v-for="i in list" :key="i.key">
        <NoteFeedCard
          v-if="i.kind === 'tasting'"
          :tasting="asT(i)"
          :own="i.own"
          :cheered="hasCheered(asT(i))"
          :cheers="cheerCount(asT(i))"
          :wished="wished(asT(i))"
          :owned="owned(asT(i))"
          @cheer="cheer(asT(i))"
          @wish="wish(asT(i).coffeeName, asT(i).roasterName)"
        />
        <FeedCoffee
          v-else-if="i.kind === 'coffee'"
          :coffee="asC(i)"
          :own="i.own"
          :wished="!!wishlistStore.findMatchingItem(asC(i))"
          @wish="wish(asC(i).name, asC(i).roasterName)"
        />
        <FeedRecipe v-else :recipe="asR(i)" :own="i.own" :saved="savedRecipes.has(i.id)" @save="saveRecipe(asR(i))" />
      </template>

        <p v-if="!list.length && tab === 'discover'" class="am-empty">Todavía no hay nada público en esta vista. Puedes publicar lo tuyo desde «Quién lo ve».</p>
        <p v-if="!list.length && tab === 'following' && friends.length" class="am-empty">Tus amigos aún no han compartido nada. Cuando lo hagan, lo verás aquí.</p>

        <NuxtLink v-if="tab === 'following' && !friends.length" to="/app/friends" class="am-invite">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
          <span class="am-col">
            <span class="am-strong">Invita a tu gente cafetera</span>
            <span class="am-hint">Así ves sus notas aquí y ellos las tuyas</span>
          </span>
        </NuxtLink>
      </div>
    </div>
</template>

<style scoped>
.am { max-width: 640px; margin: 0 auto; padding: 20px 16px 24px; display: flex; flex-direction: column; gap: 12px; color: var(--ink); font-family: var(--font-sans); }
.am-head { display: flex; align-items: center; justify-content: space-between; }
.am-title { margin: 0; font: 400 34px/36px var(--font-display); letter-spacing: -0.01em; }
.am-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.am-seg { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 4px; border-radius: 12px; background: var(--surface); }
.am-seg button { height: 36px; border-radius: 9px; font: 500 14px/1 var(--font-sans); color: var(--ink-soft); }
.am-seg button[aria-selected='true'] { background: var(--bg); color: var(--ink); font-weight: 600; }
.am-friends { display: flex; gap: 14px; overflow-x: auto; scrollbar-width: none; color: var(--ink); }
.am-friend { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: var(--touch-min); max-width: 64px; }
.am-fname { font-size: 12px; line-height: 16px; max-width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.am-chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
.am-chips button { height: var(--chip-height); padding: 0 14px; border-radius: 99px; background: var(--surface); font: 400 14px/1 var(--font-sans); white-space: nowrap; flex-shrink: 0; }
.am-chips button[aria-pressed='true'] { background: var(--primary); color: var(--on-primary); }
.am-hint { margin: 0; font-size: 13px; line-height: 18px; color: var(--ink-soft); }
.am-list { display: flex; flex-direction: column; gap: 12px; }
.am-skel { height: 150px; border-radius: var(--radius-lg); background: var(--surface); }
.am-empty { margin: 8px 0; font-size: 14px; line-height: 20px; color: var(--ink-soft); }
.am-invite { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: var(--radius-lg); border: 1.5px dashed var(--ink-faint); color: var(--ink); }
.am-col { display: flex; flex-direction: column; gap: 2px; }
.am-strong { font: 600 14px/18px var(--font-sans); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>

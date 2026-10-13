<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Coffee, Tasting, WishlistItem } from '~/types'

// Amigos v2: Siguiendo (notas que tus amigos comparten contigo) y Descubrir
// (notas públicas de la comunidad). Sustituye a Explora.

const tastingsStore = useTastingsStore()
const coffeesStore = useCoffeesStore()
const wishlistStore = useWishlistStore()
const friendsStore = useFriendsStore()
const { getCommunityFeed } = useFirebase()
const { userId } = useAuth()
const { hasCheered, cheerCount, toggle } = useCheers()
const { trackEvent } = useAnalytics()

type Tab = 'following' | 'discover'
const tab = ref<Tab>('following')
const following = ref<Tasting[]>([])
const discover = ref<Tasting[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const byDate = (a: Tasting, b: Tasting) =>
  (b.brewDate?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0) - (a.brewDate?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [shared, community] = await Promise.all([
      tastingsStore.loadShared().then(() => tastingsStore.sharedList as Tasting[]),
      getCommunityFeed<Tasting>('tastings'),
    ])
    following.value = [...shared].sort(byDate)
    discover.value = community.filter(t => t.userId !== userId.value).sort(byDate)
  }
  catch (e: any) {
    error.value = e?.code === 'failed-precondition'
      ? 'Descubrir necesita un índice de Firestore. Revisa la consola para crearlo.'
      : 'No pudimos cargar las notas. Desliza hacia abajo para reintentar.'
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

const list = computed(() => tab.value === 'following' ? following.value : discover.value)
const norm = (s?: string) => (s || '').trim().toLowerCase()

function owned(t: Tasting) {
  return (coffeesStore.list as Coffee[]).some(c => norm(c.name) === norm(t.coffeeName))
}

function wished(t: Tasting) {
  return (wishlistStore.list as WishlistItem[]).some(w => norm(w.coffeeName) === norm(t.coffeeName) && norm(w.roasterName) === norm(t.roasterName))
}

async function cheer(t: Tasting) {
  const next = await toggle(t)
  for (const arr of [following, discover]) {
    const i = arr.value.findIndex(x => x.id === t.id)
    if (i !== -1) arr.value[i] = next
  }
  if (next !== t) trackEvent('note_cheer', { on: hasCheered(next), tab: tab.value })
}

async function wish(t: Tasting) {
  const { added } = await wishlistStore.addFromCoffee({ name: t.coffeeName, roasterName: t.roasterName } as Coffee)
  if (added) trackEvent('note_want_to_try', { tab: tab.value })
}
</script>

<template>
  <UiPullToRefresh :on-refresh="load">
    <div class="am">
      <header class="am-head">
        <h1 class="am-title">Amigos</h1>
        <NuxtLink to="/app/friends" class="am-icon" aria-label="Mis amigos e invitaciones">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
        </NuxtLink>
      </header>

      <div role="tablist" aria-label="Notas" class="am-seg">
        <button type="button" role="tab" :aria-selected="tab === 'following'" @click="tab = 'following'">Siguiendo</button>
        <button type="button" role="tab" :aria-selected="tab === 'discover'" @click="tab = 'discover'">Descubrir</button>
      </div>

      <p v-if="tab === 'discover'" class="am-hint">Notas públicas de la comunidad</p>

      <div v-if="loading" class="am-list" aria-busy="true">
        <div v-for="n in 3" :key="n" class="am-skel" />
      </div>

      <p v-else-if="error" class="am-empty">{{ error }}</p>

      <div v-else class="am-list">
        <NoteFeedCard
          v-for="t in list"
          :key="t.id"
          :tasting="t"
          :cheered="hasCheered(t)"
          :cheers="cheerCount(t)"
          :wished="wished(t)"
          :owned="owned(t)"
          @cheer="cheer(t)"
          @wish="wish(t)"
        />

        <p v-if="!list.length && tab === 'discover'" class="am-empty">Todavía no hay notas públicas. Puedes publicar la tuya desde «Quién la ve» en el detalle de una nota.</p>
        <p v-if="!list.length && tab === 'following' && friendsStore.accepted.length" class="am-empty">Tus amigos aún no han compartido notas contigo.</p>

        <NuxtLink v-if="tab === 'following'" to="/app/friends" class="am-invite">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
          <span class="am-col">
            <span class="am-strong">Invita a tu gente cafetera</span>
            <span class="am-hint">Así ves sus notas aquí y ellos las tuyas</span>
          </span>
        </NuxtLink>
      </div>
    </div>
  </UiPullToRefresh>
</template>

<style scoped>
.am { max-width: 640px; margin: 0 auto; padding: 20px 16px 24px; display: flex; flex-direction: column; gap: 12px; color: var(--ink); font-family: var(--font-sans); }
.am-head { display: flex; align-items: center; justify-content: space-between; }
.am-title { margin: 0; font: 400 34px/36px var(--font-display); letter-spacing: -0.01em; }
.am-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.am-seg { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 4px; border-radius: 12px; background: var(--surface); }
.am-seg button { height: 36px; border-radius: 9px; font: 500 14px/1 var(--font-sans); color: var(--ink-soft); }
.am-seg button[aria-selected='true'] { background: var(--bg); color: var(--ink); font-weight: 600; }
.am-hint { margin: 0; font-size: 13px; line-height: 18px; color: var(--ink-soft); }
.am-list { display: flex; flex-direction: column; gap: 12px; }
.am-skel { height: 150px; border-radius: var(--radius-lg); background: var(--surface); }
.am-empty { margin: 8px 0; font-size: 14px; line-height: 20px; color: var(--ink-soft); }
.am-invite { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: var(--radius-lg); border: 1.5px dashed var(--ink-faint); color: var(--ink); }
.am-col { display: flex; flex-direction: column; gap: 2px; }
.am-strong { font: 600 14px/18px var(--font-sans); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>

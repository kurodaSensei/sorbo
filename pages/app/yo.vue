<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { Tasting, WishlistItem } from '~/types'

// Yo v2: tu perfil y lo que es tuyo. Reúne lo que en v1 eran pestañas o
// entradas sueltas (Cafés, Wishlist, catálogos, Ajustes).

const { currentUser } = useAuth()
const tastingsStore = useTastingsStore()
const coffeesStore = useCoffeesStore()
const wishlistStore = useWishlistStore()

onMounted(() => {
  if (!tastingsStore.list.length) tastingsStore.loadAll().catch(() => {})
  if (!coffeesStore.list.length) coffeesStore.loadAll().catch(() => {})
  if (!wishlistStore.list.length) wishlistStore.loadAll().catch(() => {})
})

const name = computed(() => currentUser.value?.displayName || currentUser.value?.email?.split('@')[0] || '')
const pending = computed(() => (wishlistStore.list as WishlistItem[]).filter(w => w.status === 'pending').length)

// Semanas seguidas con al menos una nota, contando la actual o la anterior.
const streak = computed(() => {
  const week = (ms: number) => {
    const d = new Date(ms)
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
    return Math.floor(monday.getTime() / (7 * 86400000))
  }
  const weeks = new Set((tastingsStore.list as Tasting[])
    .map(t => t.brewDate?.toMillis?.() ?? t.createdAt?.toMillis?.())
    .filter((x): x is number => typeof x === 'number')
    .map(week))
  let w = week(Date.now())
  if (!weeks.has(w)) w -= 1
  let n = 0
  while (weeks.has(w)) { n++; w-- }
  return n
})
</script>

<template>
  <div class="yo">
    <header class="yo-head">
      <UiAvatar :name="name" :src="currentUser?.photoURL ?? undefined" size="lg" />
      <span class="yo-id">
        <h1 class="yo-name">{{ name }}</h1>
        <NuxtLink to="/app/profile" class="yo-edit">Editar perfil</NuxtLink>
      </span>
    </header>

    <div class="yo-stats">
      <div><span class="yo-num">{{ tastingsStore.list.length }}</span><span class="yo-cap">{{ tastingsStore.list.length === 1 ? 'nota' : 'notas' }}</span></div>
      <div><span class="yo-num">{{ coffeesStore.list.length }}</span><span class="yo-cap">{{ coffeesStore.list.length === 1 ? 'café' : 'cafés' }}</span></div>
      <div><span class="yo-num">{{ streak }} sem</span><span class="yo-cap">seguidas</span></div>
    </div>

    <section class="yo-group">
      <h2 class="yo-label">Mi colección</h2>
      <div class="yo-list">
        <NuxtLink to="/app/coffees" class="yo-row"><span>Mis cafés</span><span class="yo-end">{{ coffeesStore.list.length }} ›</span></NuxtLink>
        <NuxtLink to="/app/coffees?f=wish" class="yo-row"><span>Quiero probar</span><span class="yo-end">{{ pending }} ›</span></NuxtLink>
        <NuxtLink to="/app/friends" class="yo-row"><span>Mis amigos</span><span class="yo-end">›</span></NuxtLink>
      </div>
    </section>

    <section class="yo-group">
      <h2 class="yo-label">Cuenta</h2>
      <div class="yo-list">
        <NuxtLink to="/app/settings" class="yo-row">
          <span class="yo-col"><span>Personalizar listas</span><span class="yo-sub">Marcas, métodos, variedades, procesos, sabores</span></span>
          <span class="yo-end">›</span>
        </NuxtLink>
        <NuxtLink to="/app/settings" class="yo-row"><span>Ajustes</span><span class="yo-end">›</span></NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.yo { max-width: 640px; margin: 0 auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; color: var(--ink); font-family: var(--font-sans); }
.yo-head { display: flex; align-items: center; gap: 14px; }
.yo-id { display: flex; flex-direction: column; gap: 2px; }
.yo-name { margin: 0; font: 400 28px/30px var(--font-display); }
.yo-edit { font-size: 13px; color: var(--ink-soft); min-height: 24px; }
.yo-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.yo-stats > div { padding: 12px; border-radius: var(--radius-md); background: var(--surface); display: flex; flex-direction: column; gap: 2px; }
.yo-num { font: 400 26px/28px var(--font-display); }
.yo-cap { font-size: 12px; color: var(--ink-soft); }
.yo-group { display: flex; flex-direction: column; }
.yo-label { margin: 0 0 6px; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.yo-list { border-radius: var(--radius-md); background: var(--surface); display: flex; flex-direction: column; }
.yo-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 50px; padding: 8px 14px; font-size: 15px; color: var(--ink); }
.yo-row + .yo-row { border-top: 1px solid var(--line); }
.yo-row:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; border-radius: var(--radius-md); }
.yo-col { display: flex; flex-direction: column; }
.yo-sub { font-size: 12px; line-height: 16px; color: var(--ink-soft); }
.yo-end { font-size: 14px; color: var(--ink-soft); flex-shrink: 0; }
</style>

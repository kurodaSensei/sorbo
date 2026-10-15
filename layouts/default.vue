<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const { currentUser } = useAuth()
const friendsStore = useFriendsStore()
const router = useRouter()
const route = useRoute()
const { light } = useHaptic()

watch(
  () => currentUser.value?.uid,
  (uid) => {
    if (uid) friendsStore.load().catch(() => {})
    else friendsStore.reset()
  },
  { immediate: true },
)

const userName = computed(() => {
  const u = currentUser.value
  if (!u) return ''
  return u.displayName || (u.email ? u.email.split('@')[0] : '')
})

const sidebarUser = computed(() =>
  userName.value
    ? { name: userName.value, photoURL: currentUser.value?.photoURL ?? null }
    : null,
)

const sidebarSections = [
  {
    title: 'Diario',
    items: [
      { key: 'home', label: 'Inicio', to: '/app' },
      { key: 'explore', label: 'Explora', to: '/app/explore' },
      { key: 'coffees', label: 'Cafés', to: '/app/coffees' },
      { key: 'tastings', label: 'Catas', to: '/app/tastings' },
      { key: 'recipes', label: 'Recetas', to: '/app/recipes' },
      { key: 'wishlist', label: 'Wishlist', to: '/app/wishlist' },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { key: 'roasters', label: 'Marcas', to: '/app/roasters' },
      { key: 'varieties', label: 'Variedades', to: '/app/varieties' },
      { key: 'methods', label: 'Métodos', to: '/app/methods' },
      { key: 'processes', label: 'Procesos', to: '/app/processes' },
      { key: 'notes', label: 'Notas', to: '/app/notes' },
    ],
  },
]

// Tab bar mobile: 5 items, el núcleo del diario. Wishlist se accede desde
// el header de la página Cafés (ícono bookmark) — ver pages/app/coffees.
const mobileTabs = [
  { key: 'home', label: 'Inicio', to: '/app' },
  { key: 'explore', label: 'Explora', to: '/app/explore' },
  { key: 'coffees', label: 'Cafés', to: '/app/coffees' },
  { key: 'tastings', label: 'Catas', to: '/app/tastings' },
  { key: 'recipes', label: 'Recetas', to: '/app/recipes' },
]

// ─── Swipe horizontal entre tabs ────────────────────────────────────────────
// Solo en mobile y solo en la raíz de cada tab (no en detalles/wizards).
// Encuentra el índice del tab actual basado en el path y permite avanzar
// ±1 con un swipe horizontal sin deriva vertical significativa.
const SWIPE_DISTANCE = 80
const SWIPE_VELOCITY = 0.4
const SWIPE_VERTICAL_DRIFT = 60

const currentTabIndex = computed(() => {
  return mobileTabs.findIndex(t => t.to === route.path)
})

const swipeStart = ref({ x: 0, y: 0, t: 0, active: false })

function onSwipeStart(e: TouchEvent) {
  // Solo activamos cuando estamos en la raíz de un tab — en detalles y
  // wizards no queremos interceptar (el swipe-back desde edge se encarga).
  if (currentTabIndex.value < 0) return
  // Ignorar swipes que empiezan en el edge izquierdo (reservado al swipe-back)
  if (e.touches[0].clientX < 24) return
  swipeStart.value = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY,
    t: performance.now(),
    active: true,
  }
}

function onSwipeEnd(e: TouchEvent) {
  if (!swipeStart.value.active) return
  swipeStart.value.active = false

  const touch = e.changedTouches[0]
  const dx = touch.clientX - swipeStart.value.x
  const dy = Math.abs(touch.clientY - swipeStart.value.y)
  const elapsed = performance.now() - swipeStart.value.t
  const velocity = Math.abs(dx) / Math.max(elapsed, 1)

  if (Math.abs(dx) < SWIPE_DISTANCE) return
  if (dy > SWIPE_VERTICAL_DRIFT) return
  if (velocity < SWIPE_VELOCITY) return

  const dir = dx > 0 ? -1 : 1 // swipe right → tab previous, swipe left → next
  const nextIndex = currentTabIndex.value + dir

  if (nextIndex < 0 || nextIndex >= mobileTabs.length) return

  light()
  router.push(mobileTabs[nextIndex].to)
}
</script>

<template>
  <div class="min-h-svh bg-paper text-moss font-sans antialiased flex">
    <UiSidebar
      :sections="sidebarSections"
      :user="sidebarUser"
      class="hidden lg:flex"
    />

    <div class="flex-1 flex flex-col min-w-0">
      <main
        class="flex-1 pb-[88px] lg:pb-0 pt-[env(safe-area-inset-top)]"
        @touchstart.passive="onSwipeStart"
        @touchend.passive="onSwipeEnd"
      >
        <slot />
      </main>
    </div>

    <UiTabBar :items="mobileTabs" class="lg:hidden" />
  </div>
</template>

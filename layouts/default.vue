<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const { currentUser } = useAuth()
const friendsStore = useFriendsStore()
// Navegación v3 (barra lateral y barra inferior), detrás de su interruptor.
const v3Nav = useFlag('navegacion')

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
      { key: 'home', icon: 'lucide:house', label: 'Inicio', to: '/app' },
      { key: 'explore', icon: 'lucide:compass', label: 'Explora', to: '/app/explore' },
      { key: 'coffees', icon: 'lucide:coffee', label: 'Cafés', to: '/app/coffees' },
      { key: 'tastings', icon: 'lucide:file-text', label: 'Catas', to: '/app/tastings' },
      { key: 'recipes', icon: 'lucide:book-open', label: 'Recetas', to: '/app/recipes' },
      { key: 'wishlist', icon: 'lucide:bookmark', label: 'Wishlist', to: '/app/wishlist' },
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

// Barra lateral v3: «Notas» pasa a «Notas de sabor».
const v3Catalogs = sidebarSections[1].items.map(i => (i.key === 'notes' ? { ...i, label: 'Notas de sabor' } : i))

// Con el interruptor «social», la Wishlist se llama «Quiero probar».
const v3Social = useFlag('social')
const v3Items = computed(() => sidebarSections[0].items.map(i => (i.key === 'wishlist' && v3Social.value ? { ...i, label: 'Quiero probar' } : i)))

// Tab bar mobile: 5 items, el núcleo del diario. Wishlist se accede desde
// el header de la página Cafés (ícono bookmark) — ver pages/app/coffees.
const mobileTabs = [
  { key: 'home', icon: 'lucide:house', label: 'Inicio', to: '/app' },
  { key: 'explore', icon: 'lucide:compass', label: 'Explora', to: '/app/explore' },
  { key: 'coffees', icon: 'lucide:coffee', label: 'Cafés', to: '/app/coffees' },
  { key: 'tastings', icon: 'lucide:file-text', label: 'Catas', to: '/app/tastings' },
  { key: 'recipes', icon: 'lucide:book-open', label: 'Recetas', to: '/app/recipes' },
]
</script>

<template>
  <div class="min-h-svh bg-paper text-moss font-sans antialiased flex">
    <V3Sidebar
      v-if="v3Nav"
      :items="v3Items"
      :catalogs="v3Catalogs"
      :user="sidebarUser"
    />
    <UiSidebar
      v-else
      :sections="sidebarSections"
      :user="sidebarUser"
      class="hidden lg:flex"
    />

    <div class="flex-1 flex flex-col min-w-0">
      <main
        class="flex-1 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0 pt-[env(safe-area-inset-top)]"
      >
        <slot />
      </main>
    </div>

    <V3TabBar v-if="v3Nav" :items="mobileTabs" />
    <UiTabBar v-else :items="mobileTabs" class="lg:hidden" />
  </div>
</template>

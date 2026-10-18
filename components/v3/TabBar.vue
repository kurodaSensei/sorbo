<script setup lang="ts">
// Barra inferior v3 (móvil): icono y nombre; la activa lleva una píldora detrás del icono.
defineProps<{ items: { key: string, label: string, to: string, icon?: string }[] }>()

const route = useRoute()
const isActive = (to: string) => (to === '/app' ? route.path === '/app' : route.path.startsWith(to))
</script>

<template>
  <nav aria-label="Navegación" class="v3 tabbar">
    <NuxtLink
      v-for="item in items"
      :key="item.key"
      :to="item.to"
      :aria-current="isActive(item.to) ? 'page' : undefined"
      class="tab"
    >
      <span v-if="item.icon" class="tab-icon"><Icon :name="item.icon" size="22" /></span>
      <span>{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  height: 56px;
  padding: 0 8px env(safe-area-inset-bottom);
  background: color-mix(in srgb, var(--bg) 95%, transparent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--line);
}
@media (min-width: 1024px) { .tabbar { display: none; } }
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 44px;
  color: var(--ink-soft);
  font: 500 12px/16px var(--font-sans);
  text-decoration: none;
}
.tab-icon { display: flex; align-items: center; justify-content: center; width: 56px; height: 28px; border-radius: 9999px; transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.tab[aria-current='page'] { color: var(--ink); font-weight: 600; }
.tab[aria-current='page'] .tab-icon { background: color-mix(in srgb, var(--tint) 55%, var(--bg)); color: var(--primary); }
@media (prefers-reduced-motion: reduce) { .tab-icon { transition: none; } }
</style>

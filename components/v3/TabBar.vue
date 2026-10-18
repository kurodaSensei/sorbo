<script setup lang="ts">
// Barra inferior v3 (móvil): icono y nombre; la activa en primary.
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
      <Icon v-if="item.icon" :name="item.icon" size="22" />
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
.tab[aria-current='page'] { color: var(--primary); font-weight: 600; }
</style>

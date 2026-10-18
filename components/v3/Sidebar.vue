<script setup lang="ts">
// Barra lateral v3 (escritorio, desde 1024 px): destinos con icono y catálogos debajo.
type NavItem = { key: string, label: string, to: string, icon?: string }

defineProps<{
  items: NavItem[]
  catalogs: NavItem[]
  user: { name: string, photoURL: string | null } | null
}>()

const route = useRoute()
const isActive = (to: string) => (to === '/app' ? route.path === '/app' : route.path.startsWith(to))
</script>

<template>
  <aside class="v3 sidebar">
    <NuxtLink to="/app" class="brand" aria-label="Sorbo, ir a Inicio">
      <UiLogo variant="mark" size="sm" />
      <span class="wordmark">Sorbo<span class="dot" aria-hidden="true">.</span></span>
    </NuxtLink>

    <nav aria-label="Navegación" class="nav">
      <div class="group">
        <NuxtLink
          v-for="item in items"
          :key="item.key"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="item"
        >
          <Icon v-if="item.icon" :name="item.icon" size="22" class="icon" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
      <div class="group">
        <span class="v3-label group-title">Catálogos</span>
        <NuxtLink
          v-for="item in catalogs"
          :key="item.key"
          :to="item.to"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="item item--sub"
        >
          {{ item.label }}
        </NuxtLink>
      </div>
    </nav>

    <NuxtLink v-if="user" to="/app/settings" class="me">
      <UiAvatar :name="user.name" :src="user.photoURL ?? undefined" size="sm" />
      <span class="me-text">
        <span class="me-name">{{ user.name }}</span>
        <span class="v3-meta">Ajustes</span>
      </span>
    </NuxtLink>
  </aside>
</template>

<style scoped>
.sidebar {
  position: sticky;
  top: 0;
  height: 100svh;
  width: 248px;
  flex: none;
  box-sizing: border-box;
  padding: 24px 12px;
  border-right: 1px solid var(--line);
  display: none;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
}
@media (min-width: 1024px) { .sidebar { display: flex; } }
.brand { display: flex; align-items: center; gap: 10px; padding: 0 12px; color: var(--ink); text-decoration: none; }
.wordmark { font: 400 26px/1 var(--font-display); }
.dot { color: var(--accent); }
.nav { display: flex; flex-direction: column; gap: 20px; }
.group { display: flex; flex-direction: column; gap: 2px; }
.group-title { padding: 0 12px 6px; }
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 12px;
  color: var(--ink-soft);
  font: 400 15px/22px var(--font-sans);
  text-decoration: none;
}
.item:hover { background: var(--surface); color: var(--ink); }
.item[aria-current='page'] { background: var(--surface); color: var(--ink); font-weight: 600; }
.item[aria-current='page'] .icon { color: var(--primary); }
.item--sub { min-height: 40px; padding-left: 46px; }
.me { margin-top: auto; display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 0 12px; border-radius: 12px; color: var(--ink); text-decoration: none; }
.me:hover { background: var(--surface); }
.me-text { display: flex; flex-direction: column; min-width: 0; }
.me-name { font: 600 15px/22px var(--font-sans); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>

<script setup lang="ts">
// Panel admin: su propia barra lateral, sin la navegación de la app. En el teléfono se apila arriba.
const items = [
  { key: 'pulso', icon: 'lucide:activity', label: 'Pulso', to: '/app/admin' },
]
const route = useRoute()

useHead({ title: 'Admin · Sorbo', meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template>
  <div class="v3 admin">
    <aside class="side">
      <div class="brand">
        <UiLogo variant="mark" size="sm" />
        <span class="wordmark">Sorbo<span class="dot" aria-hidden="true">.</span></span>
        <span class="pill">Admin</span>
      </div>
      <nav aria-label="Admin" class="nav">
        <NuxtLink
          v-for="item in items"
          :key="item.key"
          :to="item.to"
          :aria-current="route.path === item.to ? 'page' : undefined"
          class="item"
        >
          <Icon :name="item.icon" size="22" class="icon" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
      <NuxtLink to="/app" class="item back">
        <Icon name="lucide:arrow-left" size="22" />
        <span>Volver a la app</span>
      </NuxtLink>
    </aside>
    <main class="main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.admin { min-height: 100svh; display: flex; flex-wrap: wrap; font-variant-numeric: tabular-nums; }
.side {
  flex: 1 1 248px;
  box-sizing: border-box;
  min-width: 0;
  padding: 24px 12px;
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.brand { display: flex; align-items: center; gap: 10px; padding: 0 12px; }
.wordmark { font: 400 26px/1 var(--font-display); }
.dot { color: var(--accent); }
.pill { margin-left: auto; padding: 4px 10px; border-radius: 9999px; background: var(--brand-surface); color: var(--on-brand-surface); font: 600 12px/16px var(--font-sans); }
.nav { display: flex; flex-direction: column; gap: 2px; }
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
.back { margin-top: auto; }
.main { flex: 999 1 560px; box-sizing: border-box; min-width: 0; padding: 40px 48px 64px; }
@media (max-width: 640px) { .main { padding: 24px 16px 48px; } }
</style>

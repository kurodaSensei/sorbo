<script setup lang="ts">
// Panel admin: su propia barra lateral, sin la navegación de la app. En el teléfono se apila arriba.
const items = [
  { key: 'pulso', icon: 'lucide:activity', label: 'Pulso', to: '/app/admin' },
  { key: 'usuarios', icon: 'lucide:users', label: 'Usuarios', to: '/app/admin/usuarios' },
  { key: 'catalogos', icon: 'lucide:book', label: 'Catálogos', to: '/app/admin/catalogos' },
  { key: 'salud', icon: 'lucide:heart-pulse', label: 'Salud', to: '/app/admin/salud' },
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

<style>
/* Piezas comunes de las páginas del panel (Pulso, Usuarios, Catálogos, Salud). */
.admin .page { max-width: 1120px; display: flex; flex-direction: column; gap: 32px; }
.admin .head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 20px; }
.admin .titles { display: flex; flex-direction: column; gap: 10px; }
.admin .titles h1 { margin: 0; }
.admin .subtitle { margin: 0; font: italic 400 19px/26px var(--font-display); color: var(--ink-soft); }
.admin .seg { display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: var(--surface); }
.admin .seg button { min-height: 40px; padding: 0 16px; border: 0; border-radius: 10px; background: transparent; color: var(--ink-soft); font: 600 14px/20px var(--font-sans); cursor: pointer; }
.admin .seg button[aria-pressed='true'] { background: var(--bg); color: var(--ink); }
.admin .loading { display: flex; align-items: center; gap: 10px; margin: 0; }
.admin .retry { margin-left: 8px; border: 0; background: none; padding: 0; font: inherit; font-weight: 600; cursor: pointer; }
.admin .card { display: flex; flex-direction: column; gap: 16px; box-sizing: border-box; min-width: 0; padding: 24px; border-radius: 18px; background: var(--surface); }
.admin .row { display: flex; flex-wrap: wrap; gap: 16px; align-items: stretch; }
.admin .wide { flex: 3 1 520px; }
.admin .narrow { flex: 2 1 360px; }
.admin .card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.admin .card-head--stack { flex-direction: column; align-items: flex-start; gap: 4px; }
.admin .card-title { margin: 0; font: 400 24px/28px var(--font-display); }
.admin .table-box { overflow-x: auto; }
.admin .table { width: 100%; min-width: 480px; border-collapse: collapse; font: 400 14px/20px var(--font-sans); }
.admin .table th { padding: 8px; text-align: left; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.admin .table td { padding: 12px 8px; border-top: 1px solid var(--line); }
.admin .table :is(th, .admin td):first-child { padding-left: 0; }
.admin .name { font-weight: 500; }
.admin .soft { color: var(--ink-soft); }
.admin .dark { background: var(--brand-surface); color: var(--on-brand-surface); }
.admin .dot { color: var(--accent); }
</style>

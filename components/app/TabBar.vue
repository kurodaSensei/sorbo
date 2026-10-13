<script setup lang="ts">
import { APP_TABS, isTabActive } from '~/utils/navigation'

const route = useRoute()
const ui = useUiStore()
const { light } = useHaptic()
</script>

<template>
  <nav aria-label="Navegación" class="tabbar">
    <template v-for="(tab, i) in APP_TABS" :key="tab.key">
      <button
        v-if="i === 2"
        type="button"
        class="plus"
        aria-label="Anotar taza"
        @click="light(); ui.openNoteSheet()"
      >
        <AppIcon name="plus" :size="26" :stroke="2.25" />
      </button>
      <NuxtLink
        :to="tab.to"
        class="tab"
        :aria-current="isTabActive(tab, route.path) ? 'page' : undefined"
        @click="light()"
      >
        <AppIcon :name="tab.icon" :size="24" :stroke="isTabActive(tab, route.path) ? 2 : 1.75" />
        {{ tab.label }}
      </NuxtLink>
    </template>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 30;
  height: calc(var(--tabbar-height) + env(safe-area-inset-bottom));
  padding: 6px 8px env(safe-area-inset-bottom);
  box-sizing: border-box;
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  background: color-mix(in srgb, var(--bg) 96%, transparent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--line);
}
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 60px;
  min-height: 48px;
  padding-top: 6px;
  font: 500 11px/14px var(--font-sans);
  color: var(--ink-soft);
}
.tab[aria-current='page'] {
  color: var(--primary);
  font-weight: 600;
}
.plus {
  width: var(--action-size);
  height: var(--action-size);
  margin-top: -2px;
  border-radius: var(--radius-xl);
  background: var(--action-bg);
  color: var(--action-fg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.plus:active {
  transform: scale(0.96);
}
</style>

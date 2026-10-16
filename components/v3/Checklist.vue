<script setup lang="ts">
// Primeros pasos v3. Misma lógica que UiOnboardingChecklist; v1 se borra en la limpieza final.
const emit = defineEmits<{ dismiss: [] }>()

const coffeesStore = useCoffeesStore()
const tastingsStore = useTastingsStore()
const recipesStore = useRecipesStore()
const friendsStore = useFriendsStore()

onMounted(() => {
  if (coffeesStore.list.length === 0) coffeesStore.loadAll().catch(() => {})
  if (tastingsStore.list.length === 0) tastingsStore.loadAll().catch(() => {})
  if (recipesStore.list.length === 0) recipesStore.loadAll().catch(() => {})
  if (friendsStore.list.length === 0) friendsStore.load().catch(() => {})
})

const steps = computed(() => [
  { key: 'coffee', label: 'Registra tu primer café', eta: '30 s', to: '/app/coffees/new', done: coffeesStore.list.length > 0 },
  { key: 'tasting', label: 'Haz tu primera cata', eta: '2 min', to: '/app/tastings/new', done: tastingsStore.list.length > 0 },
  { key: 'friend', label: 'Agrega un amigo cafetero', eta: '1 min', to: '/app/friends', done: friendsStore.accepted.length > 0 },
  { key: 'recipe', label: 'Guarda una receta', eta: '3 min', to: '/app/recipes/new', done: recipesStore.list.length > 0 },
])
const doneCount = computed(() => steps.value.filter(s => s.done).length)
</script>

<template>
  <section aria-label="Primeros pasos" class="checklist">
    <div class="head">
      <span class="v3-label">Primeros pasos · {{ doneCount }}/{{ steps.length }}</span>
      <button type="button" class="hide" @click="emit('dismiss')">Ocultar</button>
    </div>
    <div class="track" aria-hidden="true">
      <div class="fill" :style="{ width: `${(doneCount / steps.length) * 100}%` }" />
    </div>
    <ul class="list">
      <li v-for="step in steps" :key="step.key">
        <NuxtLink :to="step.to" class="step">
          <span :class="['dot', { done: step.done }]" aria-hidden="true">
            <Icon v-if="step.done" name="lucide:check" size="14" />
          </span>
          <span :class="['label', { done: step.done }]">{{ step.label }}</span>
          <span class="v3-meta">{{ step.done ? 'Listo' : step.eta }}</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.checklist { display: flex; flex-direction: column; gap: 12px; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.hide {
  height: 40px;
  padding: 0 12px;
  margin: -8px -8px -8px 0;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: var(--ink-soft);
  font: 600 13px/16px var(--font-sans);
  cursor: pointer;
}
.track { height: 4px; border-radius: 9999px; background: var(--track); }
.fill { height: 4px; border-radius: 9999px; background: var(--primary); transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1); }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.step { display: flex; align-items: center; gap: 12px; min-height: 44px; color: var(--ink); text-decoration: none; }
.dot {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  box-shadow: inset 0 0 0 2px var(--ink-faint);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dot.done { background: var(--primary); color: var(--on-primary); box-shadow: none; }
.label { flex: 1; font: 400 15px/22px var(--font-sans); }
.label.done { color: var(--ink-soft); text-decoration: line-through; }
</style>

<script setup lang="ts">
// Pantalla de catálogo v3 (Variedades, Métodos, Procesos, Notas de sabor).
// Cada página le pasa sus listas y maneja agregar y activar/desactivar con su store.
interface CatalogItem { value: string, label: string, custom: boolean }

const props = defineProps<{
  word: string
  subtitle: string
  addLabel: string
  placeholder: string
  active: CatalogItem[]
  inactive: CatalogItem[]
  emptyText: string
  submitting?: boolean
}>()

const draft = defineModel<string>({ default: '' })
const emit = defineEmits<{ add: [], toggle: [value: string] }>()

const router = useRouter()
const canAdd = computed(() => draft.value.trim().length > 0 && !props.submitting)
</script>

<template>
  <div class="v3 catalog">
    <header class="head">
      <button type="button" class="back" aria-label="Volver" @click="router.back()">
        <Icon name="lucide:arrow-left" size="22" />
        <span class="back-label">Ajustes</span>
      </button>
      <h1 class="title">Tus <span class="v3-accent-word">{{ word }}</span></h1>
      <p class="v3-subtitle sub">{{ subtitle }} Los activos aparecen al anotar.</p>
    </header>

    <div class="layout">
      <div class="side">
        <form class="add" novalidate @submit.prevent="canAdd && emit('add')">
          <label for="catalog-add" class="v3-label">{{ addLabel }}</label>
          <div class="add-row">
            <input id="catalog-add" v-model="draft" class="add-input" :placeholder="placeholder" autocomplete="off">
            <button type="submit" class="v3-btn v3-btn--primary" :disabled="!canAdd" :aria-busy="submitting || undefined">
              <span v-if="submitting" class="v3-spinner" aria-hidden="true" />
              Agregar
            </button>
          </div>
        </form>
        <p class="v3-meta m-0 desktop-only">Desactivar no borra nada: lo que ya anotaste sigue igual, solo deja de aparecer al anotar.</p>
        <p class="v3-meta m-0 legend"><span class="dot" aria-hidden="true" />Los que agregaste tú.</p>
      </div>

      <div class="lists">
        <section aria-labelledby="cat-active" class="group">
          <div class="group-head">
            <h2 id="cat-active" class="v3-label m-0">Activos · {{ active.length }}</h2>
            <span class="v3-meta hint">Toca para desactivar</span>
          </div>
          <div v-if="active.length" class="chips">
            <button
              v-for="item in active"
              :key="item.value"
              type="button"
              class="chip chip--on"
              aria-pressed="true"
              :aria-label="`${item.label}${item.custom ? ', propio' : ''}: activo. Desactivar`"
              @click="emit('toggle', item.value)"
            >
              <Icon name="lucide:check" size="14" />{{ item.label }}<span v-if="item.custom" class="dot" aria-hidden="true" />
            </button>
          </div>
          <p v-else class="empty">{{ emptyText }}</p>
        </section>

        <section v-if="inactive.length" aria-labelledby="cat-inactive" class="group">
          <div class="group-head">
            <h2 id="cat-inactive" class="v3-label m-0">Inactivos · {{ inactive.length }}</h2>
            <span class="v3-meta hint">Toca para volver a usar</span>
          </div>
          <div class="chips">
            <button
              v-for="item in inactive"
              :key="item.value"
              type="button"
              class="chip chip--off"
              aria-pressed="false"
              :aria-label="`${item.label}${item.custom ? ', propio' : ''}: inactivo. Activar`"
              @click="emit('toggle', item.value)"
            >
              {{ item.label }}<span v-if="item.custom" class="dot" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.catalog { box-sizing: border-box; max-width: 1060px; padding: 8px 20px 32px; display: flex; flex-direction: column; gap: 28px; }
.head { display: flex; flex-direction: column; gap: 8px; }
.back { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-left: -12px; padding: 0 12px; border: 0; background: transparent; color: var(--ink); font: 600 15px/20px var(--font-sans); cursor: pointer; }
.back-label { display: none; }
.title { margin: 0; font: 400 38px/35px var(--font-display); letter-spacing: -0.01em; }
.sub { margin: 0; }
.desktop-only { display: none; }
.layout { display: flex; flex-direction: column; gap: 28px; }
.side { display: flex; flex-direction: column; gap: 14px; }
.add { display: flex; flex-direction: column; gap: 8px; }
.add-row { display: flex; gap: 8px; }
.add-input { flex: 1; min-width: 0; box-sizing: border-box; min-height: 48px; border: 0; border-radius: 12px; background: var(--surface); padding: 12px 16px; font: 400 18px/24px var(--font-display); color: var(--ink); outline: none; }
.add-input::placeholder { color: var(--ink-soft); font-style: italic; }
.add-input:focus-visible { box-shadow: inset 0 0 0 2px var(--primary); }
.add-row .v3-btn { flex: none; }
.legend { display: flex; align-items: center; gap: 8px; font-size: 12px; line-height: 16px; }
.dot { width: 6px; height: 6px; border-radius: 9999px; background: var(--accent); flex: none; }
.lists { display: flex; flex-direction: column; gap: 28px; }
.group { display: flex; flex-direction: column; gap: 10px; }
.group-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.hint { font-size: 12px; line-height: 16px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 0; border-radius: 9999px; font: 500 13px/16px var(--font-sans); cursor: pointer; }
.chip--on { background: var(--primary); color: var(--on-primary); }
.chip--on:hover { background: var(--primary-pressed); }
.chip--off { background: transparent; box-shadow: inset 0 0 0 1px var(--line-strong); color: var(--ink-soft); }
.chip--off:hover { background: var(--surface); color: var(--ink); }
.empty { margin: 0; font: italic 400 15px/22px var(--font-display); color: var(--ink-soft); }

@media (min-width: 1024px) {
  .catalog { padding: 40px 48px 64px; gap: 32px; }
  .back-label { display: inline; }
  .title { font-size: 56px; line-height: 52px; letter-spacing: -0.02em; }
  .sub { font-size: 19px; line-height: 26px; }
  .desktop-only { display: block; }
  .layout { flex-direction: row; gap: 40px; align-items: flex-start; }
  .side { flex: 1 1 300px; min-width: 0; padding: 24px; border-radius: 18px; background: var(--surface-strong); }
  .add-row { flex-direction: column; align-items: flex-start; }
  .add-input { width: 100%; background: var(--bg); }
  .lists { flex: 2 1 420px; min-width: 0; }
  .chip { height: 36px; padding: 0 14px; font-size: 15px; line-height: 20px; }
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CatalogItem } from '~/utils/catalogs'

// Pantalla de un catálogo («Personalizar listas»): añadir uno propio y
// activar o desactivar cada opción. Las páginas solo traen los datos.
const props = defineProps<{
  title: string
  items: CatalogItem[]
  disabled: string[]
  /** Etiqueta del campo: «Añadir método». */
  addLabel: string
  placeholder: string
}>()
const emit = defineEmits<{ add: [label: string]; toggle: [value: string] }>()

const router = useRouter()
const draft = ref('')
const q = ref('')

// ponytail: la búsqueda aparece solo con listas largas; subir el umbral si estorba.
const searchable = computed(() => props.items.length > 12)
const shown = computed(() => {
  const s = q.value.trim().toLowerCase()
  return s ? props.items.filter(i => i.label.toLowerCase().includes(s)) : props.items
})
const activeTotal = computed(() => props.items.filter(i => !props.disabled.includes(i.value)).length)

function add() {
  const v = draft.value.trim()
  if (!v) return
  emit('add', v)
  draft.value = ''
}
</script>

<template>
  <div class="cl">
    <header class="cl-head">
      <button type="button" class="cl-icon" aria-label="Volver" @click="router.back()">
        <AppIcon name="right" :size="22" :stroke="2" style="transform: rotate(180deg)" />
      </button>
      <h1 class="cl-title">{{ title }}</h1>
    </header>

    <form class="cl-add" @submit.prevent="add">
      <div class="cl-field">
        <label for="cl-new" class="cl-label">{{ addLabel }}</label>
        <input id="cl-new" v-model="draft" class="cl-input" autocomplete="off" :placeholder="placeholder">
      </div>
      <button type="submit" class="cl-btn" :disabled="!draft.trim()">Añadir</button>
    </form>

    <label v-if="searchable" class="cl-search">
      <input v-model="q" type="search" placeholder="Buscar" aria-label="Buscar">
    </label>

    <section class="cl-group">
      <h2 class="cl-label">{{ activeTotal }} de {{ items.length }} activas</h2>
      <div class="cl-list">
        <div v-for="i in shown" :key="i.value" class="cl-row">
          <span :id="`cl-${i.value}`">{{ i.label }}</span>
          <button
            type="button"
            role="switch"
            class="cl-switch"
            :aria-checked="!disabled.includes(i.value)"
            :aria-labelledby="`cl-${i.value}`"
            @click="emit('toggle', i.value)"
          >
            <span />
          </button>
        </div>
        <p v-if="!shown.length" class="cl-empty">Nada coincide con la búsqueda.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cl { max-width: 640px; margin: 0 auto; padding: 12px 16px 32px; display: flex; flex-direction: column; gap: 16px; color: var(--ink); font-family: var(--font-sans); }
.cl-head { display: flex; align-items: center; gap: 4px; margin: 0 -8px; }
.cl-title { flex: 1; margin: 0; font: 400 28px/30px var(--font-display); }
.cl-icon { width: var(--touch-min); height: var(--touch-min); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ink); }
.cl-label { margin: 0 0 8px; font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.cl-add { display: flex; align-items: flex-end; gap: 8px; }
.cl-field { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.cl-field .cl-label { margin-bottom: 8px; }
.cl-input { box-sizing: border-box; width: 100%; height: var(--field-height); border: 0; border-radius: var(--radius-sm); background: var(--surface); padding: 0 14px; font: 400 16px/22px var(--font-sans); color: var(--ink); }
.cl-input::placeholder { color: var(--ink-soft); }
.cl-input:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--primary); }
.cl-btn { height: var(--field-height); padding: 0 18px; border-radius: var(--radius-md); background: var(--primary); color: var(--on-primary); font: 600 15px/1 var(--font-sans); }
.cl-btn:disabled { background: var(--surface-strong); color: var(--ink-soft); }
.cl-search { display: flex; height: var(--field-height); padding: 0 14px; border-radius: var(--radius-sm); background: var(--surface); }
.cl-search input { flex: 1; min-width: 0; border: 0; background: transparent; font: 400 16px/22px var(--font-sans); color: var(--ink); outline: none; }
.cl-search:focus-within { box-shadow: 0 0 0 2px var(--primary); }
.cl-group { display: flex; flex-direction: column; }
.cl-list { border-radius: var(--radius-md); background: var(--surface); display: flex; flex-direction: column; }
.cl-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 50px; padding: 4px 14px; font-size: 15px; }
.cl-row + .cl-row { border-top: 1px solid var(--line); }
.cl-empty { margin: 0; padding: 14px; font-size: 14px; color: var(--ink-soft); }
.cl-switch { width: 50px; height: 30px; border-radius: 99px; position: relative; background: var(--surface-strong); flex-shrink: 0; transition: background 200ms; }
.cl-switch span { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 99px; background: var(--bg); transition: transform 200ms; }
.cl-switch[aria-checked='true'] { background: var(--primary); }
.cl-switch[aria-checked='true'] span { transform: translateX(20px); background: var(--on-primary); }
button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
</style>

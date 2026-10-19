<script setup lang="ts">
// «Variedades» v3: cada variedad es un chip que se quita con la ×; el campo sigue abierto
// para agregar otra. Enter o coma la agrega. Sugiere del catálogo y, si no existe, la crea
// en el catálogo (como el selector de una sola variedad).
import { onClickOutside } from '@vueuse/core'

const props = withDefaults(defineProps<{ label?: string, placeholder?: string }>(), {
  label: 'Variedades',
  placeholder: 'Caturra, Geisha…',
})
const model = defineModel<string[]>({ required: true })

const { varieties } = useCatalog()
const settings = useSettingsStore()
const id = useId()

const query = ref('')
const focused = ref(false)
const box = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
onClickOutside(box, () => { focused.value = false })

const has = (v: string) => model.value.some(x => x.toLowerCase() === v.toLowerCase())
const suggestions = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return (varieties.value || []).filter(v => v.toLowerCase().includes(q) && !has(v)).slice(0, 6)
})
const exact = computed(() => (varieties.value || []).find(v => v.toLowerCase() === query.value.trim().toLowerCase()))
const canCreate = computed(() => !!query.value.trim() && !exact.value && !has(query.value.trim()))
const open = computed(() => focused.value && (suggestions.value.length > 0 || canCreate.value))

function add(v: string) {
  const name = v.trim()
  if (name && !has(name)) model.value = [...model.value, name]
  query.value = ''
  input.value?.focus()
}
async function addTyped() {
  const name = query.value.trim()
  if (!name) return
  // Como el selector de una variedad: Enter toma la primera sugerencia; solo crea si no hay.
  if (exact.value) return add(exact.value)
  if (suggestions.value.length) return add(suggestions.value[0]!)
  add(name)
  // Nueva en el catálogo: la próxima vez aparece como sugerencia. Si falla, el café igual la guarda.
  settings.addVariety(name).catch(() => {})
}
function remove(v: string) {
  model.value = model.value.filter(x => x !== v)
  input.value?.focus()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTyped()
  }
  else if (e.key === 'Backspace' && !query.value && model.value.length) {
    model.value = model.value.slice(0, -1)
  }
  else if (e.key === 'Escape') {
    focused.value = false
  }
}
// Pegar o escribir «Caturra, Castillo» agrega las dos.
function onInput() {
  if (!query.value.includes(',')) return
  const parts = query.value.split(',')
  query.value = parts.pop() || ''
  for (const p of parts) if (p.trim()) add(p)
}
</script>

<template>
  <div ref="box" class="vf">
    <label :for="`${id}-in`" class="v3-label">{{ props.label }} <span class="opt">· opcional</span></label>
    <div :class="['vf-box', { 'vf-box--on': focused }]" @click="input?.focus()">
      <span v-for="v in model" :key="v" class="vf-chip">
        {{ v }}
        <button type="button" class="vf-x" :aria-label="`Quitar ${v}`" @click.stop="remove(v)"><Icon name="lucide:x" size="14" /></button>
      </span>
      <input
        :id="`${id}-in`"
        ref="input"
        v-model="query"
        class="vf-input"
        role="combobox"
        autocomplete="off"
        :aria-expanded="open"
        :aria-controls="`${id}-list`"
        :placeholder="model.length ? 'Agregar otra…' : props.placeholder"
        @focus="focused = true"
        @keydown="onKey"
        @input="onInput"
      >
    </div>
    <span class="v3-meta hint">Si es un blend, agrega cada variedad.</span>
    <ul v-if="open" :id="`${id}-list`" role="listbox" :aria-label="props.label" class="vf-list">
      <li v-for="s in suggestions" :key="s" role="option" aria-selected="false" class="vf-opt" @mousedown.prevent="add(s)">{{ s }}</li>
      <li v-if="canCreate" role="option" aria-selected="false" class="vf-opt vf-opt--new" @mousedown.prevent="addTyped">+ Agregar «{{ query.trim() }}» como nueva</li>
    </ul>
  </div>
</template>

<style scoped>
.vf { position: relative; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.opt { font-weight: 400; color: var(--ink-soft); }
.vf-box { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 48px; box-sizing: border-box; padding: 6px; border-radius: 12px; background: var(--surface); cursor: text; }
.vf-box--on { box-shadow: inset 0 0 0 2px var(--primary); }
.vf-chip { display: inline-flex; align-items: center; gap: 2px; height: 34px; padding: 0 4px 0 12px; border-radius: 9999px; background: var(--primary); color: var(--on-primary); font: 500 14px/18px var(--font-sans); }
.vf-x { width: 28px; height: 28px; border: 0; border-radius: 9999px; background: transparent; color: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.vf-x:hover { background: color-mix(in srgb, var(--on-primary) 18%, transparent); }
.vf-input { flex: 1 1 120px; min-width: 0; height: 36px; border: 0; background: transparent; padding: 0 10px; font: 400 18px/24px var(--font-display); color: var(--ink); outline: none; }
.vf-input:focus, .vf-input:focus-visible { outline: none; box-shadow: none; }
.vf-input::placeholder { color: var(--ink-soft); font: italic 400 18px/24px var(--font-display); }
.hint { font-size: 13px; line-height: 18px; }
.vf-list { position: absolute; z-index: 10; left: 0; right: 0; top: calc(100% - 22px); margin: 0; padding: 6px; list-style: none; border-radius: 14px; background: var(--bg); box-shadow: 0 8px 24px rgba(20, 23, 18, 0.14), inset 0 0 0 1px var(--line); }
.vf-opt { display: flex; align-items: center; min-height: 44px; padding: 0 10px; border-radius: 10px; font: 400 16px/22px var(--font-sans); color: var(--ink); cursor: pointer; }
.vf-opt:hover { background: var(--surface); }
.vf-opt--new { font: 600 14px/18px var(--font-sans); color: var(--primary); }
</style>

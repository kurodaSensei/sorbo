<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import type { Roaster, RoasterInput } from '~/types'

// Hoja para crear o editar una marca. Valida y entrega el payload; quien la
// abre decide cómo guardar o borrar.
const props = defineProps<{ open: boolean; roaster: Roaster | null; saving?: boolean }>()
const emit = defineEmits<{ close: []; save: [payload: RoasterInput]; remove: [] }>()

const blank = () => ({ name: '', country: 'Colombia', city: '', website: '', instagram: '', rating: null as number | null, roasts: true })
const form = ref(blank())
const errors = ref<{ name?: string; country?: string }>({})

watch(() => props.open, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
  if (!open) return
  const r = props.roaster
  errors.value = {}
  form.value = r
    ? {
        name: r.name || '',
        country: r.country || 'Colombia',
        city: r.city || '',
        website: r.website || '',
        instagram: r.instagram || '',
        rating: r.rating ?? null,
        // Sin el campo cuenta como «tuesta» (documentos antiguos).
        roasts: r.roasts !== false,
      }
    : blank()
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}
if (typeof window !== 'undefined') window.addEventListener('keydown', onKeydown)
onUnmounted(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

function save() {
  const f = form.value
  errors.value = {}
  if (!f.name.trim()) errors.value.name = 'Falta el nombre'
  if (!f.country.trim()) errors.value.country = 'Falta el país'
  if (errors.value.name || errors.value.country) return
  emit('save', {
    name: f.name.trim(),
    country: f.country.trim(),
    city: f.city.trim() || undefined,
    website: f.website.trim() || undefined,
    instagram: f.instagram.trim() || undefined,
    rating: f.rating ?? undefined,
    // Solo se guarda cuando es false: sin el campo ya cuenta como «tuesta».
    roasts: f.roasts ? undefined : false,
  } as RoasterInput)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="rs-fade">
      <div v-if="open" class="rs-scrim" @click="emit('close')" />
    </Transition>
    <Transition name="rs-up">
      <div v-if="open" class="rs-sheet" role="dialog" aria-modal="true" :aria-label="roaster ? 'Editar marca' : 'Nueva marca'">
        <div class="rs-grab" aria-hidden="true"><span /></div>
        <header class="rs-head">
          <button type="button" class="rs-cancel" @click="emit('close')">Cancelar</button>
          <h2 class="rs-title">{{ roaster ? 'Editar marca' : 'Nueva marca' }}</h2>
          <span class="rs-cancel" aria-hidden="true" />
        </header>

        <div class="rs-body">
          <div class="rs-field">
            <label for="rs-name" class="rs-label">Nombre</label>
            <input id="rs-name" v-model="form.name" class="rs-input" placeholder="Libertario" autocomplete="off">
            <span v-if="errors.name" class="rs-error">{{ errors.name }}</span>
          </div>
          <div class="rs-field">
            <label for="rs-country" class="rs-label">País</label>
            <input id="rs-country" v-model="form.country" class="rs-input" placeholder="Colombia">
            <span v-if="errors.country" class="rs-error">{{ errors.country }}</span>
          </div>
          <div class="rs-field">
            <label for="rs-city" class="rs-label">Ciudad (opcional)</label>
            <input id="rs-city" v-model="form.city" class="rs-input" placeholder="Bogotá">
          </div>
          <div class="rs-field">
            <label for="rs-web" class="rs-label">Sitio web (opcional)</label>
            <input id="rs-web" v-model="form.website" class="rs-input" type="url" placeholder="libertario.co">
          </div>
          <div class="rs-field">
            <label for="rs-ig" class="rs-label">Instagram (opcional)</label>
            <input id="rs-ig" v-model="form.instagram" class="rs-input" placeholder="@libertario">
          </div>

          <div class="rs-switch-row">
            <span id="rs-roasts-l">Tuesta su café</span>
            <button
              type="button"
              role="switch"
              class="rs-switch"
              :aria-checked="form.roasts"
              aria-labelledby="rs-roasts-l"
              @click="form.roasts = !form.roasts"
            >
              <span />
            </button>
          </div>

          <div class="rs-field">
            <div class="rs-rate-h">
              <label for="rs-rating" class="rs-label">Puntaje (opcional)</label>
              <span class="rs-rate-v">{{ form.rating !== null ? form.rating.toFixed(1) : '—' }} / 5</span>
            </div>
            <input id="rs-rating" v-model.number="form.rating" type="range" min="0" max="5" step="0.1" class="rs-range">
          </div>
        </div>

        <footer class="rs-foot">
          <button type="button" class="rs-save" :disabled="saving" :aria-busy="saving || undefined" @click="save">
            {{ saving ? 'Guardando…' : roaster ? 'Guardar cambios' : 'Guardar marca' }}
          </button>
          <button v-if="roaster" type="button" class="rs-delete" @click="emit('remove')">Eliminar marca</button>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rs-scrim { position: fixed; inset: 0; z-index: 50; background: rgba(20, 23, 18, 0.55); }
.rs-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
  max-height: min(92svh, 860px);
  display: flex; flex-direction: column;
  background: var(--bg); color: var(--ink); font-family: var(--font-sans);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  box-shadow: var(--shadow-sheet);
  overflow: hidden;
}
.rs-grab { display: flex; justify-content: center; padding-top: 8px; flex-shrink: 0; }
.rs-grab span { width: 40px; height: 5px; border-radius: 99px; background: var(--line); }
.rs-head { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; flex-shrink: 0; }
.rs-cancel { min-width: 84px; min-height: var(--touch-min); padding: 0 8px; text-align: left; font-size: 15px; color: var(--ink-soft); }
.rs-title { margin: 0; font: 600 16px/20px var(--font-sans); }
.rs-body { flex: 1; overflow-y: auto; padding: 8px 16px 20px; display: flex; flex-direction: column; gap: 16px; }
.rs-body > * { flex-shrink: 0; }
.rs-field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.rs-label { font: 600 13px/16px var(--font-sans); color: var(--ink-soft); }
.rs-error { font: 400 12px/16px var(--font-sans); color: var(--danger); }
.rs-input { box-sizing: border-box; width: 100%; height: var(--field-height); border: 0; border-radius: var(--radius-sm); background: var(--surface); padding: 0 14px; font: 400 16px/22px var(--font-sans); color: var(--ink); }
.rs-input::placeholder { color: var(--ink-soft); }
.rs-input:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--primary); }
.rs-switch-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: var(--touch-min); font-size: 15px; }
.rs-switch { width: 50px; height: 30px; border-radius: 99px; position: relative; background: var(--surface-strong); flex-shrink: 0; transition: background 200ms; }
.rs-switch span { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 99px; background: var(--bg); transition: transform 200ms; }
.rs-switch[aria-checked='true'] { background: var(--primary); }
.rs-switch[aria-checked='true'] span { transform: translateX(20px); background: var(--on-primary); }
.rs-rate-h { display: flex; align-items: baseline; justify-content: space-between; }
.rs-rate-v { font: 400 15px/1 var(--font-mono); }
.rs-range { width: 100%; min-height: var(--touch-min); accent-color: var(--primary); }
.rs-foot { flex-shrink: 0; padding: 12px 16px calc(16px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--line); background: var(--bg); }
.rs-save { height: var(--button-height); border-radius: var(--radius-md); background: var(--primary); color: var(--on-primary); font: 600 16px/20px var(--font-sans); }
.rs-save:disabled { background: var(--surface-strong); color: var(--ink-soft); }
.rs-delete { min-height: var(--touch-min); font: 500 14px/1 var(--font-sans); color: var(--danger); }
button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
@media (min-width: 1024px) {
  .rs-sheet { left: 50%; right: auto; bottom: auto; top: 50%; width: 440px; transform: translate(-50%, -50%); border-radius: var(--radius-sheet); }
  .rs-grab { display: none; }
}
@media (prefers-reduced-motion: no-preference) {
  .rs-fade-enter-active, .rs-fade-leave-active { transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1); }
  .rs-fade-enter-from, .rs-fade-leave-to { opacity: 0; }
  .rs-up-enter-active, .rs-up-leave-active { transition: transform 260ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms; }
  .rs-up-enter-from, .rs-up-leave-to { transform: translateY(100%); }
}
@media (prefers-reduced-motion: no-preference) and (min-width: 1024px) {
  .rs-up-enter-from, .rs-up-leave-to { transform: translate(-50%, -46%); opacity: 0; }
}
</style>

<script setup lang="ts">
// Formulario de marca v3: lo usa la hoja (móvil) y el panel de detalle (escritorio).
interface RoasterForm {
  name: string
  country: string
  city: string
  website: string
  instagram: string
  rating: number | null
  roasts: boolean
}

defineProps<{
  editing: boolean
  errors: { name?: string, country?: string }
  submitting?: boolean
}>()
const form = defineModel<RoasterForm>({ required: true })
const emit = defineEmits<{ save: [], remove: [] }>()

const ratingText = computed(() => (form.value.rating === null ? '—' : form.value.rating.toFixed(1)))
function onRating(e: Event) {
  form.value.rating = Number((e.target as HTMLInputElement).value)
}
</script>

<template>
  <form class="rform" novalidate @submit.prevent="emit('save')">
    <V3Field v-model="form.name" label="Nombre" placeholder="Libertario" :error="errors.name" />
    <div class="pair">
      <V3Field v-model="form.country" label="País" placeholder="Colombia" :error="errors.country" />
      <V3Field v-model="form.city" label="Ciudad" placeholder="Bogotá" />
    </div>
    <div class="pair">
      <V3Field v-model="form.website" label="Sitio web" type="url" placeholder="libertario.co" />
      <V3Field v-model="form.instagram" label="Instagram" placeholder="@libertario" />
    </div>

    <label class="switch-row">
      <span class="switch-text">
        <span class="switch-title">Tuesta su café</span>
        <span class="v3-meta">Apágalo si es tienda o marca que no tuesta.</span>
      </span>
      <input v-model="form.roasts" type="checkbox" role="switch" class="switch-input">
      <span class="switch" aria-hidden="true" />
    </label>

    <div class="rating">
      <div class="rating-head">
        <label for="roaster-rating" class="v3-label">Tu valoración de la marca <span class="optional">· opcional</span></label>
        <span class="rating-value">{{ ratingText }}<span v-if="form.rating !== null" class="rating-max">/5</span></span>
      </div>
      <input
        id="roaster-rating"
        type="range"
        min="0"
        max="5"
        step="0.1"
        :value="form.rating ?? 0"
        :aria-valuetext="form.rating === null ? 'Sin valoración' : `${ratingText} de 5`"
        class="range"
        @input="onRating"
      >
    </div>

    <div class="actions">
      <button type="submit" class="v3-btn v3-btn--primary" :disabled="submitting" :aria-busy="submitting || undefined">
        <span v-if="submitting" class="v3-spinner" aria-hidden="true" />
        {{ editing ? 'Guardar cambios' : 'Crear marca' }}
      </button>
      <button v-if="editing" type="button" class="v3-btn delete" @click="emit('remove')">Eliminar marca</button>
    </div>
  </form>
</template>

<style scoped>
.rform { display: flex; flex-direction: column; gap: 14px; }
.pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.pair :deep(.input) { min-width: 0; }
.switch-row { position: relative; display: flex; align-items: center; gap: 14px; min-height: 56px; padding: 6px 14px; border-radius: 14px; background: var(--surface); cursor: pointer; }
.switch-text { flex: 1; display: flex; flex-direction: column; }
.switch-title { font: 500 15px/22px var(--font-sans); }
.switch-input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.switch { flex: none; position: relative; width: 48px; height: 28px; border-radius: 9999px; background: var(--ink-faint); transition: background-color 150ms; }
.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 9999px; background: var(--bg); transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1); }
.switch-input:checked + .switch { background: var(--primary); }
.switch-input:checked + .switch::after { transform: translateX(20px); background: var(--on-primary); }
.switch-input:focus-visible + .switch { outline: 2px solid var(--primary); outline-offset: 2px; }
.rating { display: flex; flex-direction: column; gap: 10px; }
.rating-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.optional { font-weight: 400; }
.rating-value { font: 400 22px/24px var(--font-display); }
.rating-max { font-size: 13px; color: var(--ink-soft); }
.range { width: 100%; height: 24px; accent-color: var(--primary); cursor: pointer; }
.actions { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.delete { background: transparent; color: var(--danger); }
.delete:hover { background: var(--surface); }
@media (prefers-reduced-motion: reduce) { .switch, .switch::after { transition: none; } }
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Tasting } from '~/types'
import { toDate } from '~/utils/dates'
import { learnWindow } from '~/composables/useReminders'

// «¿Te lo recuerdo mañana?»: aparece en el Diario después de las primeras
// notas, una sola vez. La ventana se precarga con la hora en que sueles anotar.

const DISMISS_KEY = 'sorbo:reminder-prompt'
const tastingsStore = useTastingsStore()
const settings = useSettingsStore()
const { supported, needsInstall, enable } = useReminders()
const toast = useToast()

const canShow = ref(false)
const ios = ref(false)
const busy = ref(false)

const win = computed(() => learnWindow(
  (tastingsStore.list as Tasting[]).slice(0, 20).map(t => toDate(t.brewDate)?.getHours()).filter((h): h is number => h !== undefined),
))
const label = computed(() => win.value === 'morning' ? 'en la mañana' : 'en la tarde')

onMounted(async () => {
  try { if (localStorage.getItem(DISMISS_KEY)) return }
  catch { /* almacenamiento bloqueado: se muestra */ }
  await settings.load()
  if (settings.prefs?.reminders?.enabled) return
  ios.value = needsInstall()
  canShow.value = ios.value || await supported()
})

function dismiss() {
  canShow.value = false
  try { localStorage.setItem(DISMISS_KEY, '1') }
  catch { /* ignorar */ }
}

async function accept() {
  busy.value = true
  try {
    if (await enable(win.value)) {
      if (settings.prefs) settings.prefs.reminders = { ...settings.prefs.reminders, enabled: true, window: win.value }
      toast.success(`Listo: te lo recuerdo ${label.value}, solo si no has anotado`)
      dismiss()
    }
    else {
      toast.error('Las notificaciones están bloqueadas. Puedes activarlas en la configuración del navegador.')
    }
  }
  catch (e) {
    toast.error('No se pudo activar el recordatorio', e)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <section v-if="canShow && tastingsStore.list.length" class="rp" aria-labelledby="rp-t">
    <h2 id="rp-t" class="rp-t">¿Te lo recuerdo mañana?</h2>
    <p v-if="ios" class="rp-p">En iPhone, primero instala Sorbo en tu pantalla de inicio: Compartir → Agregar a pantalla de inicio. Luego actívalo en Ajustes.</p>
    <p v-else class="rp-p">Un aviso {{ label }}, como mucho uno al día. Si ya anotaste, no te molesto.</p>
    <div class="rp-actions">
      <button v-if="!ios" type="button" class="rp-yes" :disabled="busy" @click="accept">Sí, recuérdame</button>
      <button type="button" class="rp-no" @click="dismiss">{{ ios ? 'Entendido' : 'Ahora no' }}</button>
    </div>
  </section>
</template>

<style scoped>
.rp { padding: 16px; border-radius: var(--radius-lg); background: var(--surface); display: flex; flex-direction: column; gap: 6px; }
.rp-t { margin: 0; font: 400 20px/24px var(--font-display); color: var(--ink); }
.rp-p { margin: 0; font-size: 14px; line-height: 20px; color: var(--ink-soft); }
.rp-actions { display: flex; gap: 8px; margin-top: 8px; }
.rp-yes { min-height: var(--touch-min); padding: 0 16px; border-radius: var(--radius-md); background: var(--primary); color: var(--on-primary); font: 600 15px/20px var(--font-sans); }
.rp-yes:disabled { opacity: 0.6; }
.rp-no { min-height: var(--touch-min); padding: 0 12px; font: 500 15px/20px var(--font-sans); color: var(--ink-soft); }
</style>

<script setup lang="ts">
// «¿Te lo recuerdo mañana?» en Inicio: una sola vez, después de tu primera nota.
// La ventana (mañana o tarde) sale de la hora en que sueles anotar. Misma lógica que la v2.
import type { Tasting } from '~/types'
import { learnWindow } from '~/composables/useReminders'

const DISMISS_KEY = 'sorbo:reminder-prompt'
const tastingsStore = useTastingsStore()
const settings = useSettingsStore()
const reminders = useReminders()
const { install } = usePwaInstall()
const toast = useToast()

const canShow = ref(false)
const ios = ref(false)
const busy = ref(false)

const win = computed(() => learnWindow(
  (tastingsStore.list as Tasting[]).slice(0, 20)
    .map(t => t.brewDate?.toDate?.()?.getHours())
    .filter((h): h is number => h !== undefined),
))
const when = computed(() => (win.value === 'morning' ? 'en la mañana' : 'en la tarde'))

onMounted(async () => {
  try {
    if (localStorage.getItem(DISMISS_KEY)) return
  }
  catch { /* almacenamiento bloqueado: se muestra */ }
  if (!settings.prefs) await settings.load().catch(() => {})
  if (settings.prefs?.reminders?.enabled || reminders.blocked()) return
  ios.value = reminders.needsInstall()
  canShow.value = ios.value || await reminders.supported()
})

function dismiss() {
  canShow.value = false
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  }
  catch { /* ignorar */ }
}

async function accept() {
  if (ios.value) return install()
  busy.value = true
  try {
    if (await reminders.enable(win.value)) {
      if (settings.prefs) settings.prefs.reminders = { ...settings.prefs.reminders, enabled: true, window: win.value }
      toast.success(`Listo: te lo recuerdo ${when.value}, solo si no has anotado`)
      dismiss()
    }
    else {
      toast.error('Bloqueaste los avisos de Sorbo. Actívalos en los ajustes del navegador.')
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
  <section v-if="canShow && tastingsStore.list.length" aria-labelledby="rem-card-t" class="rem v3-enter">
    <div class="rem-top">
      <span class="rem-icon" aria-hidden="true"><Icon name="lucide:bell-ring" size="22" /></span>
      <span class="rem-text">
        <h2 id="rem-card-t" class="rem-t">¿Te lo recuerdo <span class="v3-accent-word">mañana</span>?</h2>
        <span class="rem-p">{{ ios ? 'En iPhone, los avisos llegan solo si instalas Sorbo en tu pantalla de inicio.' : `Un aviso ${when}, como mucho uno al día. Si ya anotaste, no te molesto.` }}</span>
      </span>
    </div>
    <span v-if="ios" class="rem-ios"><Icon name="lucide:share" size="18" class="rem-ios-icon" />Compartir → Agregar a pantalla de inicio</span>
    <div class="rem-actions">
      <button type="button" class="v3-btn v3-btn--primary rem-yes" :disabled="busy" :aria-busy="busy || undefined" @click="accept">
        <span v-if="busy" class="v3-spinner" aria-hidden="true" />{{ ios ? 'Cómo instalar' : 'Sí, recuérdame' }}
      </button>
      <button type="button" class="v3-btn rem-no" @click="dismiss">Ahora no</button>
    </div>
  </section>
</template>

<style scoped>
.rem { display: flex; flex-direction: column; gap: 14px; padding: 18px; border-radius: 18px; background: var(--surface); }
.rem-top { display: flex; align-items: flex-start; gap: 14px; }
.rem-icon { flex: none; width: 44px; height: 44px; border-radius: 12px; background: var(--tint); color: var(--on-tint); display: flex; align-items: center; justify-content: center; }
.rem-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.rem-t { margin: 0; font: 400 22px/24px var(--font-display); }
.rem-p { font: 400 14px/20px var(--font-sans); color: var(--ink-soft); }
.rem-ios { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--bg); font: 400 13px/18px var(--font-sans); color: var(--ink-soft); }
.rem-ios-icon { flex: none; color: var(--ink); }
.rem-actions { display: flex; gap: 8px; }
.rem-yes { flex: 1; height: 44px; }
.rem-no { flex: none; height: 44px; padding: 0 16px; background: transparent; color: var(--ink-soft); font-weight: 500; }
</style>

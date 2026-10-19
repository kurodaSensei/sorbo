<script setup lang="ts">
// Grupo «Recordatorio» de Ajustes: interruptor, ventana (mañana o tarde) y «Enviar uno de prueba».
import type { ReminderWindow } from '~/composables/useReminders'

const settings = useSettingsStore()
const reminders = useReminders()
const toast = useToast()

const on = computed(() => !!settings.prefs?.reminders?.enabled)
const win = computed<ReminderWindow>(() => settings.prefs?.reminders?.window ?? 'morning')
const busy = ref(false)
const testing = ref(false)
const ios = ref(false)
const blocked = ref(false)
const unsupported = ref(false)

onMounted(async () => {
  ios.value = reminders.needsInstall()
  blocked.value = reminders.blocked()
  unsupported.value = !ios.value && !(await reminders.supported())
})

const locked = computed(() => ios.value || (blocked.value && !on.value) || unsupported.value)
const hint = computed(() => {
  if (ios.value) return 'En iPhone, instala Sorbo en tu pantalla de inicio para activarlo'
  if (blocked.value && !on.value) return 'Bloqueaste los avisos de Sorbo. Actívalos en los ajustes del navegador.'
  if (unsupported.value) return 'Este navegador no puede recibir avisos'
  return 'Como mucho uno al día, y nunca si ya anotaste'
})

async function toggle() {
  if (busy.value || locked.value || !settings.prefs) return
  busy.value = true
  const next = !on.value
  try {
    if (next) {
      if (!(await reminders.enable(win.value))) {
        blocked.value = reminders.blocked()
        toast.error('Bloqueaste los avisos de Sorbo. Actívalos en los ajustes del navegador.')
        return
      }
    }
    else {
      await reminders.disable()
    }
    settings.prefs.reminders = { ...settings.prefs.reminders, enabled: next, window: win.value }
  }
  catch (e) {
    toast.error('No se pudo cambiar el recordatorio', e)
  }
  finally {
    busy.value = false
  }
}

async function pick(w: ReminderWindow) {
  if (!settings.prefs || w === win.value) return
  try {
    await reminders.setWindow(w)
    settings.prefs.reminders = { ...settings.prefs.reminders, window: w }
  }
  catch (e) {
    toast.error('No se pudo cambiar la hora', e)
  }
}

async function sendTest() {
  if (testing.value) return
  testing.value = true
  try {
    const sent = await reminders.sendTest()
    if (sent) toast.success('Enviado. Llega en unos segundos')
    else toast.error('No llegó a ningún dispositivo. Apaga y vuelve a activar el recordatorio.')
  }
  catch (e) {
    // La función responde con un mensaje listo para mostrar (un minuto entre pruebas, etc.).
    const msg = (e as { message?: string })?.message
    toast.error(msg && !msg.startsWith('internal') ? msg : 'No se pudo enviar el aviso de prueba')
  }
  finally {
    testing.value = false
  }
}
</script>

<template>
  <section aria-labelledby="g-reminder" class="group">
    <h2 id="g-reminder" class="v3-label group-title">Recordatorio</h2>
    <div class="rows">
      <label :class="['row', 'row--switch', { 'row--locked': locked }]">
        <Icon name="lucide:bell-ring" size="20" class="row-icon" />
        <span class="row-text">
          <span id="rem-title" class="row-title">Recordatorio diario</span>
          <span :class="['v3-meta', { 'hint--warn': blocked && !on }]">{{ hint }}</span>
        </span>
        <input type="checkbox" role="switch" class="switch-input" :checked="on" :disabled="busy || locked" aria-labelledby="rem-title" @change="toggle">
        <span class="switch" aria-hidden="true" />
      </label>

      <template v-if="on">
        <div class="row row--static">
          <span id="rem-when" class="row-title">Cuándo</span>
          <span class="seg" role="group" aria-labelledby="rem-when">
            <button type="button" :class="['seg-btn', { 'seg-btn--on': win === 'morning' }]" :aria-pressed="win === 'morning'" @click="pick('morning')">Mañana · 8:00</button>
            <button type="button" :class="['seg-btn', { 'seg-btn--on': win === 'afternoon' }]" :aria-pressed="win === 'afternoon'" @click="pick('afternoon')">Tarde · 14:00</button>
          </span>
        </div>
        <button type="button" class="row" :disabled="testing" :aria-busy="testing || undefined" @click="sendTest">
          <span class="row-text">
            <span class="row-title row-title--action">Enviar uno de prueba</span>
            <span class="v3-meta">Llega a este dispositivo en unos segundos</span>
          </span>
          <span v-if="testing" class="v3-spinner" aria-hidden="true" />
          <Icon v-else name="lucide:send" size="18" class="row-icon" />
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.group { display: flex; flex-direction: column; gap: 10px; }
.group-title { margin: 0; padding: 0 4px; }
.rows { display: flex; flex-direction: column; padding: 0 14px; border-radius: 16px; background: var(--surface); }
.row { position: relative; display: flex; align-items: center; gap: 14px; min-height: 60px; padding: 10px 0; border: 0; border-bottom: 1px solid var(--line); background: transparent; color: var(--ink); font: inherit; text-align: left; cursor: pointer; box-sizing: border-box; }
.row:last-child { border-bottom: 0; }
.row:disabled { cursor: default; }
.row--static { justify-content: space-between; cursor: default; }
.row--locked { cursor: default; }
.row-icon { flex: none; color: var(--primary); }
.row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.row-title { font: 500 15px/22px var(--font-sans); }
.row-title--action { color: var(--primary); }
.hint--warn { color: var(--danger); }
.switch-input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.switch { flex: none; position: relative; width: 50px; height: 30px; border-radius: 9999px; background: var(--ink-faint); transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: var(--bg); transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.switch-input:checked + .switch { background: var(--primary); }
.switch-input:checked + .switch::after { transform: translateX(20px); }
.switch-input:disabled + .switch { opacity: 0.5; }
.switch-input:focus-visible + .switch { outline: 2px solid var(--primary); outline-offset: 2px; }
.seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: var(--bg); }
.seg-btn { height: 36px; padding: 0 12px; border: 0; border-radius: 9px; background: transparent; color: var(--ink); font: 500 14px/18px var(--font-sans); white-space: nowrap; cursor: pointer; }
.seg-btn--on { background: var(--primary); color: var(--on-primary); font-weight: 600; }
@media (prefers-reduced-motion: reduce) { .switch, .switch::after { transition: none; } }
</style>

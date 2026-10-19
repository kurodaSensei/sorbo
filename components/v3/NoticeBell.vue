<script setup lang="ts">
// Campana «Avisos» v3: solicitudes de amistad y actividad de tus amigos (solo dentro de la app).
// Móvil: hoja desde abajo. Escritorio: panel bajo la campana. Las solicitudes, como en v1.
import { onClickOutside, useElementBounding, useMediaQuery, useWindowSize } from '@vueuse/core'
import type { Friendship } from '~/types'

const friendsStore = useFriendsStore()
const toast = useToast()
const { notices, newCount, enabled, load, markSeen, clearNew } = useNotices()

const desktop = useMediaQuery('(min-width: 1024px)')
const open = ref(false)
const button = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const busyId = ref<string | null>(null)

onMounted(() => {
  if (!friendsStore.list.length) friendsStore.load().catch(() => {})
  load().catch(() => {})
})

const requests = computed(() => friendsStore.pendingIncoming as Friendship[])
const unread = computed(() => newCount.value + requests.value.length)
const fresh = computed(() => notices.value.filter(n => n.isNew))
const older = computed(() => notices.value.filter(n => !n.isNew))

function toggle() {
  if (open.value) return close()
  open.value = true
  load().then(markSeen).catch(() => {})
}
function close() {
  if (!open.value) return
  open.value = false
  clearNew()
}
onClickOutside(panel, () => desktop.value && close(), { ignore: [button] })
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))

// Escritorio: el panel se alinea con el borde derecho de la campana.
const { bottom, right } = useElementBounding(button)
const { width: vw } = useWindowSize()
const popStyle = computed(() => ({ top: `${bottom.value + 8}px`, right: `${Math.max(12, vw.value - right.value)}px` }))

function nameOf(f: Friendship) {
  const o = friendsStore.getOtherUser(f)
  return o?.displayName || o?.email || 'Alguien'
}
async function accept(f: Friendship) {
  if (busyId.value) return
  busyId.value = f.id
  try {
    await friendsStore.accept(f.id)
    toast.success(`Ahora son amigos con ${nameOf(f)}`)
    load(true).catch(() => {})
  }
  catch (e: any) {
    toast.error(e?.message || 'No se pudo aceptar la solicitud')
  }
  finally {
    busyId.value = null
  }
}
async function reject(f: Friendship) {
  if (busyId.value) return
  busyId.value = f.id
  try {
    await friendsStore.reject(f.id)
    toast.info('Solicitud rechazada')
  }
  catch (e: any) {
    toast.error(e?.message || 'No se pudo rechazar la solicitud')
  }
  finally {
    busyId.value = null
  }
}
</script>

<template>
  <span class="v3 bell-wrap">
    <button
      ref="button"
      type="button"
      class="bell"
      :aria-label="unread ? `Avisos, ${unread} ${unread === 1 ? 'nuevo' : 'nuevos'}` : 'Avisos'"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggle"
    >
      <Icon name="lucide:bell" size="22" />
      <span v-if="unread" class="dot" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <Transition :name="desktop ? 'v3-pop-panel' : 'v3-sheet'">
        <div v-if="open" :class="['v3', desktop ? 'pop-wrap' : 'v3-sheet-wrap']">
          <div v-if="!desktop" class="v3-sheet-veil" aria-hidden="true" @click="close" />
          <section
            ref="panel"
            role="dialog"
            :aria-modal="!desktop || undefined"
            aria-labelledby="notices-title"
            :class="desktop ? 'pop' : 'v3-sheet'"
            :style="desktop ? popStyle : undefined"
          >
            <span v-if="!desktop" class="v3-sheet-handle" aria-hidden="true" />
            <div :class="desktop ? 'pop-head' : 'v3-sheet-head'">
              <h2 id="notices-title" class="v3-sheet-title">Avisos</h2>
              <button v-if="!desktop" type="button" class="v3-sheet-close" aria-label="Cerrar" @click="close">
                <Icon name="lucide:x" size="20" />
              </button>
            </div>

            <div class="body">
              <section v-if="requests.length" aria-labelledby="notices-req" class="group">
                <h3 id="notices-req" class="v3-label group-title">Solicitudes</h3>
                <div v-for="f in requests" :key="f.id" class="req">
                  <span class="req-who">
                    <span class="avatar" aria-hidden="true">{{ nameOf(f).charAt(0).toUpperCase() }}</span>
                    <span class="req-text"><span class="req-name">{{ nameOf(f) }}</span><span class="v3-meta">quiere ser tu amigo</span></span>
                  </span>
                  <span class="req-actions">
                    <button type="button" class="v3-btn v3-btn--primary small" :disabled="busyId === f.id" @click="accept(f)">Aceptar</button>
                    <button type="button" class="v3-btn small soft" :disabled="busyId === f.id" @click="reject(f)">Rechazar</button>
                  </span>
                </div>
              </section>

              <template v-if="enabled">
                <section v-for="g in [{ title: 'Nuevo', rows: fresh }, { title: 'Antes', rows: older }].filter(x => x.rows.length)" :key="g.title" :aria-label="g.title" class="group">
                  <h3 class="v3-label group-title">{{ g.title }}</h3>
                  <div class="rows">
                    <NuxtLink v-for="n in g.rows" :key="n.key" :to="n.link" class="row" @click="close">
                      <span class="avatar" aria-hidden="true">{{ n.ini }}<span v-if="n.isNew" class="avatar-dot" /></span>
                      <span class="row-text">
                        <span class="row-verb"><span class="row-who">{{ n.who }}</span> {{ n.verb }}</span>
                        <span class="row-name">{{ n.name }}</span>
                        <span class="v3-meta small">{{ n.meta }}</span>
                      </span>
                      <span v-if="n.score" :class="['score', `tone-${n.score >= 5 ? 'high' : n.score >= 4 ? 'good' : 'none'}`]">{{ n.score }}</span>
                      <Icon name="lucide:chevron-right" size="18" class="chev" />
                    </NuxtLink>
                  </div>
                </section>
                <div v-if="!notices.length" class="empty">
                  <span class="empty-t">Nada nuevo por ahora</span>
                  <span class="v3-meta">Cuando tus amigos compartan un café, una cata o una receta, aparece aquí.</span>
                </div>
              </template>
              <div v-else class="off">
                <span class="off-t">Los avisos de amigos están apagados</span>
                <span class="v3-meta">Solo ves solicitudes. Puedes encenderlos en Ajustes.</span>
              </div>

              <NuxtLink to="/app/settings" class="settings-link" @click="close">Ajustes de avisos</NuxtLink>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.bell-wrap { display: inline-flex; }
.bell { position: relative; width: 44px; height: 44px; border: 0; border-radius: 12px; background: var(--surface); color: var(--ink); display: flex; align-items: center; justify-content: center; cursor: pointer; }
.bell:hover { background: var(--surface-strong); }
.dot { position: absolute; top: 10px; right: 10px; width: 8px; height: 8px; border-radius: 9999px; background: var(--danger); box-shadow: 0 0 0 2px var(--surface); }

.pop-wrap { position: fixed; inset: 0; z-index: 50; pointer-events: none; }
.pop { position: fixed; pointer-events: auto; width: 400px; max-width: calc(100vw - 24px); max-height: min(760px, calc(100vh - 120px)); box-sizing: border-box; border-radius: 20px; background: var(--bg); box-shadow: 0 16px 40px rgba(20, 23, 18, 0.16), 0 0 0 1px var(--line); display: flex; flex-direction: column; }
.pop-head { padding: 18px 18px 4px; }

.body { flex: 1; overflow-y: auto; padding: 8px 20px 12px; display: flex; flex-direction: column; gap: 16px; }
.pop .body { padding: 8px 18px 8px; }
.group { display: flex; flex-direction: column; gap: 8px; }
.group-title { margin: 0; padding: 0 4px; }
.req { display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 16px; background: var(--surface); }
.req-who { display: flex; align-items: center; gap: 12px; }
.req-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.req-name { font: 600 15px/20px var(--font-sans); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.req-actions { display: flex; gap: 8px; }
.req-actions .v3-btn { flex: 1; }
.small { height: 40px; font-size: 14px; }
.soft { background: var(--bg); color: var(--ink); }
.avatar { position: relative; flex: none; width: 40px; height: 40px; border-radius: 9999px; background: var(--tint); color: var(--on-tint); display: flex; align-items: center; justify-content: center; font: 400 18px/1 var(--font-display); }
.avatar-dot { position: absolute; top: -1px; left: -1px; width: 10px; height: 10px; border-radius: 9999px; background: var(--danger); box-shadow: 0 0 0 2px var(--surface); }
.rows { display: flex; flex-direction: column; padding: 0 14px; border-radius: 16px; background: var(--surface); }
.row { display: flex; align-items: center; gap: 12px; min-height: 76px; padding: 12px 0; box-sizing: border-box; color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--line); }
.row:last-child { border-bottom: 0; }
.row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.row-verb { font: 400 14px/19px var(--font-sans); color: var(--ink-soft); }
.row-who { font-weight: 600; color: var(--ink); }
.row-name { font: 400 19px/23px var(--font-display); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.small.v3-meta { font-size: 12px; line-height: 16px; }
.score { flex: none; width: 36px; height: 36px; border-radius: 10px; background: var(--surface-strong); display: flex; align-items: center; justify-content: center; font: 400 17px/1 var(--font-display); }
.score.tone-high { background: var(--accent); color: var(--on-accent); }
.score.tone-good { background: var(--tint); color: var(--on-tint); }
.chev { flex: none; color: var(--ink-soft); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 28px 16px; border-radius: 16px; background: var(--surface); text-align: center; }
.empty-t { font: 400 22px/26px var(--font-display); }
.off { display: flex; flex-direction: column; gap: 4px; padding: 16px; border-radius: 16px; background: var(--surface); }
.off-t { font: 500 15px/22px var(--font-sans); }
.settings-link { align-self: center; display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px; font: 600 14px/18px var(--font-sans); color: var(--primary); text-decoration: none; }
.v3-sheet .body { padding-bottom: calc(12px + env(safe-area-inset-bottom)); }

@media (prefers-reduced-motion: no-preference) {
  .v3-pop-panel-enter-active, .v3-pop-panel-leave-active { transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1); }
  .v3-pop-panel-enter-active .pop, .v3-pop-panel-leave-active .pop { transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1); }
  .v3-pop-panel-enter-from, .v3-pop-panel-leave-to { opacity: 0; }
  .v3-pop-panel-enter-from .pop, .v3-pop-panel-leave-to .pop { transform: translateY(-6px); }
}
</style>

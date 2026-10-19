<script setup lang="ts">
// Hoja «Compartir como imagen»: vista previa, formato, fondo y, en catas, la nota escrita.
// La imagen se arma aquí mismo y queda lista antes del toque: así «Compartir» abre el menú
// del teléfono sin perder el gesto (Safari lo exige). No se sube nada.
import { domToBlob } from 'modern-screenshot'
import type { Coffee, Recipe, Tasting } from '~/types'
import { shareContent, shareMessage, type ShareFormat, type ShareKind } from '~/utils/share'

const props = defineProps<{ kind: ShareKind, item: Coffee | Tasting | Recipe }>()
const open = defineModel<boolean>({ required: true })

const { getProcessLabel, getBrewMethodLabel } = useCatalog()
const { trackEvent } = useAnalytics()

const format = ref<ShareFormat>('historia')
const fondo = ref<'oscuro' | 'claro'>(props.kind === 'receta' ? 'claro' : 'oscuro')
const includeNote = ref(true)
const hasNote = computed(() => props.kind === 'cata' && !!(props.item as Tasting).personalNotes?.trim())

const content = computed(() => shareContent(props.kind, props.item, {
  format: format.value,
  includeNote: includeNote.value,
  labels: { process: getProcessLabel, method: getBrewMethodLabel },
}))
const height = computed(() => (format.value === 'historia' ? 1920 : 1350))
const scale = computed(() => (format.value === 'historia' ? 0.17 : 0.2))

const KIND_WORD = { cafe: 'café', cata: 'nota', receta: 'receta' } as const
const fileName = computed(() => {
  const slug = content.value.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `sorbo-${slug || props.kind}-${format.value}.png`
})

const node = ref<HTMLElement | null>(null)
const blob = ref<Blob | null>(null)
const busy = ref(false)
const failed = ref(false)
let run = 0

async function render() {
  const id = ++run
  blob.value = null
  failed.value = false
  busy.value = true
  try {
    await nextTick()
    await document.fonts.ready
    if (!node.value || id !== run) return
    // El nodo vive dentro de la vista previa a escala; se captura a tamaño real.
    const b = await domToBlob(node.value, { width: 1080, height: height.value, scale: 1, type: 'image/png' })
    if (id === run) blob.value = b
  }
  catch {
    if (id === run) failed.value = true
  }
  finally {
    if (id === run) busy.value = false
  }
}

watch([open, format, fondo, includeNote], () => {
  if (open.value) render()
}, { immediate: true })

// Pie de foto para WhatsApp (Instagram lo ignora).
const message = computed(() => shareMessage(props.kind, props.item, getBrewMethodLabel))

const canShareFiles = computed(() => {
  if (import.meta.server || !blob.value || typeof navigator.canShare !== 'function') return false
  return navigator.canShare({ files: [new File([blob.value], fileName.value, { type: 'image/png' })] })
})

function download() {
  if (!blob.value) return
  const url = URL.createObjectURL(blob.value)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.value
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function onSave() {
  if (!blob.value) return
  download()
  trackEvent('share_image', { kind: props.kind, format: format.value, action: 'save' })
}

async function onShare() {
  if (!blob.value) return
  if (!canShareFiles.value) return onSave()
  try {
    await navigator.share({ files: [new File([blob.value], fileName.value, { type: 'image/png' })], text: message.value })
    trackEvent('share_image', { kind: props.kind, format: format.value, action: 'share' })
  }
  catch {
    // Cerrar el menú del teléfono también llega aquí: no es un error.
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="v3-sheet">
      <div v-if="open" class="v3 v3-sheet-wrap" @keydown="onKey">
        <div class="v3-sheet-veil" aria-hidden="true" @click="open = false" />
        <section role="dialog" aria-modal="true" aria-labelledby="share-img-title" class="v3-sheet">
          <span class="v3-sheet-handle" aria-hidden="true" />
          <div class="v3-sheet-head">
            <h2 id="share-img-title" class="v3-sheet-title">Compartir <span class="v3-accent-word">{{ KIND_WORD[kind] }}</span></h2>
            <button type="button" class="v3-sheet-close" aria-label="Cerrar" @click="open = false">
              <Icon name="lucide:x" size="20" />
            </button>
          </div>

          <div class="body">
            <div class="stage">
              <div class="frame" :style="{ width: `${Math.round(1080 * scale)}px`, height: `${Math.round(height * scale)}px` }" role="img" :aria-label="`Vista previa: ${content.name}`">
                <div class="scaler" :style="{ transform: `scale(${scale})` }" aria-hidden="true">
                  <div ref="node"><V3ShareImage :kind="kind" :format="format" :fondo="fondo" :content="content" /></div>
                </div>
              </div>
            </div>

            <div class="opts">
              <fieldset class="opt">
                <legend class="v3-label legend">Formato</legend>
                <span class="seg">
                  <button type="button" :class="['seg-btn', { 'seg-btn--on': format === 'historia' }]" :aria-pressed="format === 'historia'" @click="format = 'historia'">Historia</button>
                  <button type="button" :class="['seg-btn', { 'seg-btn--on': format === 'publicacion' }]" :aria-pressed="format === 'publicacion'" @click="format = 'publicacion'">Publicación</button>
                </span>
              </fieldset>
              <fieldset class="opt">
                <legend class="v3-label legend">Fondo</legend>
                <span class="seg">
                  <button type="button" :class="['seg-btn', { 'seg-btn--on': fondo === 'oscuro' }]" :aria-pressed="fondo === 'oscuro'" @click="fondo = 'oscuro'">Oscuro</button>
                  <button type="button" :class="['seg-btn', { 'seg-btn--on': fondo === 'claro' }]" :aria-pressed="fondo === 'claro'" @click="fondo = 'claro'">Claro</button>
                </span>
              </fieldset>
            </div>

            <label v-if="hasNote" class="note-toggle">
              <span>Incluir tu nota escrita</span>
              <input v-model="includeNote" type="checkbox" role="switch" class="switch-input">
              <span class="switch" aria-hidden="true" />
            </label>

            <p v-if="failed" class="v3-meta v3-error m0" role="alert">No pudimos crear la imagen. <button type="button" class="retry" @click="render">Intenta de nuevo</button></p>
          </div>

          <div class="foot">
            <div class="actions">
              <button type="button" class="v3-btn save" :disabled="!blob" @click="onSave">
                <Icon name="lucide:download" size="18" />Guardar
              </button>
              <button type="button" class="v3-btn v3-btn--primary share" :disabled="!blob" :aria-busy="busy || undefined" @click="onShare">
                <span v-if="busy" class="v3-spinner" aria-hidden="true" /><Icon v-else name="lucide:share" size="18" />Compartir
              </button>
            </div>
            <p class="hint">Compartir abre el menú de tu teléfono: WhatsApp, Instagram, Facebook y más.</p>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.body { flex: 1; overflow-y: auto; padding: 8px 20px 4px; display: flex; flex-direction: column; gap: 16px; }
.m0 { margin: 0; }
.stage { display: flex; justify-content: center; padding: 16px 0; border-radius: 18px; background: var(--surface); }
.frame { flex: none; overflow: hidden; border-radius: 12px; box-shadow: 0 8px 24px rgba(20, 23, 18, 0.18); transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1), height 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.scaler { width: 1080px; transform-origin: 0 0; }
.opts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.opt { margin: 0; padding: 0; border: 0; min-width: 0; }
.legend { padding: 0 0 8px; }
.seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 14px; background: var(--surface); }
.seg-btn { min-width: 0; height: 40px; padding: 0 4px; border: 0; border-radius: 10px; background: transparent; color: var(--ink); font: 500 14px/18px var(--font-sans); cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.seg-btn--on { background: var(--bg); font-weight: 600; box-shadow: 0 1px 2px rgba(20, 23, 18, 0.08); }
.note-toggle { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; font: 500 15px/20px var(--font-sans); cursor: pointer; }
.switch-input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.switch { position: relative; flex: none; width: 50px; height: 30px; border-radius: 9999px; background: var(--track, var(--line-strong)); transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: var(--bg); transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1); }
.switch-input:checked + .switch { background: var(--primary); }
.switch-input:checked + .switch::after { transform: translateX(20px); }
.switch-input:focus-visible + .switch { outline: 2px solid var(--primary); outline-offset: 2px; }
.retry { border: 0; padding: 0; background: transparent; color: inherit; font: inherit; text-decoration: underline; cursor: pointer; }
.foot { display: flex; flex-direction: column; gap: 10px; padding: 12px 20px calc(16px + env(safe-area-inset-bottom)); }
.actions { display: flex; gap: 10px; }
.save { flex: 1; background: var(--surface); color: var(--ink); }
.share { flex: 1.4; }
.save, .share { gap: 8px; }
.hint { margin: 0; font: 400 13px/18px var(--font-sans); color: var(--ink-soft); text-align: center; }
@media (prefers-reduced-motion: reduce) { .frame, .switch, .switch::after { transition: none; } }
</style>

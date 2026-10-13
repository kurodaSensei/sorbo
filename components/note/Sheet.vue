<script setup lang="ts">
import { onUnmounted, watch } from 'vue'

// Hoja inferior «Nueva nota». Se monta una vez en el layout y la abre
// ui.openNoteSheet() desde el botón +, la tarjeta del Diario o «Repetir».
const ui = useUiStore()
const router = useRouter()

function close() {
  ui.closeNoteSheet()
}

async function onSaved(id: string) {
  ui.closeNoteSheet()
  await router.push(`/app/tastings/${id}`)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && ui.noteSheet.open) close()
}

watch(() => ui.noteSheet.open, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ns-fade">
      <div v-if="ui.noteSheet.open" class="ns-scrim" @click="close" />
    </Transition>
    <Transition name="ns-up">
      <div v-if="ui.noteSheet.open" class="ns-sheet" role="dialog" aria-modal="true" aria-label="Nueva nota">
        <div class="ns-grab" aria-hidden="true"><span /></div>
        <NoteForm
          :key="`${ui.noteSheet.coffeeId ?? 'nueva'}`"
          :initial-coffee-id="ui.noteSheet.coffeeId"
          :prefill="ui.noteSheet.prefill"
          @cancel="close"
          @saved="onSaved"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ns-scrim { position: fixed; inset: 0; z-index: 50; background: rgba(20, 23, 18, 0.55); }
.ns-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
  height: min(92svh, 860px);
  display: flex; flex-direction: column;
  background: var(--bg);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  box-shadow: var(--shadow-sheet);
  overflow: hidden;
}
.ns-sheet > :last-child { flex: 1; min-height: 0; }
.ns-grab { display: flex; justify-content: center; padding-top: 8px; flex-shrink: 0; }
.ns-grab span { width: 40px; height: 5px; border-radius: 99px; background: var(--line); }
@media (min-width: 1024px) {
  .ns-sheet { left: 50%; right: auto; bottom: auto; top: 50%; width: 440px; height: min(88vh, 820px); transform: translate(-50%, -50%); border-radius: var(--radius-sheet); }
  .ns-grab { display: none; }
}
@media (prefers-reduced-motion: no-preference) {
  .ns-fade-enter-active, .ns-fade-leave-active { transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1); }
  .ns-fade-enter-from, .ns-fade-leave-to { opacity: 0; }
  .ns-up-enter-active, .ns-up-leave-active { transition: transform 260ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms; }
  .ns-up-enter-from, .ns-up-leave-to { transform: translateY(100%); }
}
@media (prefers-reduced-motion: no-preference) and (min-width: 1024px) {
  .ns-up-enter-from, .ns-up-leave-to { transform: translate(-50%, -46%); opacity: 0; }
}
</style>

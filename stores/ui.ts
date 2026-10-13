import { defineStore } from 'pinia'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

export interface NotePrefill {
  name?: string
  brand?: string
  method?: string
  dose?: number
  water?: number
  /** Segundos de preparación. */
  time?: number
  recipeName?: string
}

interface ModalState {
  open: boolean
  component: string | null
  props: Record<string, any>
}

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(false)
  const toasts = ref<Toast[]>([])
  // Hoja «Nueva nota» (v2): se abre desde el botón + de la barra, la tarjeta
  // del Diario, «Repetir», «Anotar» en Quiero probar o al terminar el
  // temporizador. `coffeeId` precarga un café tuyo; `prefill` el resto.
  const noteSheet = ref<{ open: boolean, coffeeId: string | null, prefill: NotePrefill | null }>({ open: false, coffeeId: null, prefill: null })

  function openNoteSheet(coffeeId: string | null = null, prefill: NotePrefill | null = null) {
    noteSheet.value = { open: true, coffeeId, prefill }
  }

  function closeNoteSheet() {
    noteSheet.value = { ...noteSheet.value, open: false }
  }

  const modal = ref<ModalState>({
    open: false,
    component: null,
    props: {},
  })

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function openSidebar() {
    sidebarOpen.value = true
  }

  function closeSidebar() {
    sidebarOpen.value = false
  }

  function openModal(component: string, props: Record<string, any> = {}) {
    modal.value = { open: true, component, props }
  }

  function closeModal() {
    modal.value = { open: false, component: null, props: {} }
  }

  function addToast(message: string, type: Toast['type'] = 'info', duration: number = 4000) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    const toast: Toast = { id, message, type, duration }
    toasts.value.push(toast)

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  function removeToast(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    sidebarOpen,
    toasts,
    modal,
    noteSheet,
    openNoteSheet,
    closeNoteSheet,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    openModal,
    closeModal,
    addToast,
    removeToast,
  }
})

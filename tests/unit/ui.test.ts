import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '~/stores/ui'

describe('stores/ui', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('openNoteSheet sin args abre vacío', () => {
    const ui = useUiStore()
    expect(ui.noteSheet.open).toBe(false)
    ui.openNoteSheet()
    expect(ui.noteSheet).toEqual({ open: true, coffeeId: null, prefill: null })
  })

  it('openNoteSheet con café y prefill (temporizador)', () => {
    const ui = useUiStore()
    const prefill = { name: 'Geisha', method: 'v60', dose: 15, water: 250, time: 180, recipeName: 'Mi V60' }
    ui.openNoteSheet('c1', prefill)
    expect(ui.noteSheet).toEqual({ open: true, coffeeId: 'c1', prefill })
  })

  it('reabrir reemplaza el estado anterior (no arrastra prefill viejo)', () => {
    const ui = useUiStore()
    ui.openNoteSheet('c1', { name: 'A' })
    ui.openNoteSheet()
    expect(ui.noteSheet).toEqual({ open: true, coffeeId: null, prefill: null })
  })

  it('closeNoteSheet solo cierra y conserva los datos (para la animación de salida)', () => {
    const ui = useUiStore()
    ui.openNoteSheet('c1', { name: 'A' })
    ui.closeNoteSheet()
    expect(ui.noteSheet.open).toBe(false)
    expect(ui.noteSheet.coffeeId).toBe('c1')
  })

  it('sidebar y modal', () => {
    const ui = useUiStore()
    ui.toggleSidebar(); expect(ui.sidebarOpen).toBe(true)
    ui.closeSidebar(); expect(ui.sidebarOpen).toBe(false)
    ui.openModal('X', { a: 1 }); expect(ui.modal).toEqual({ open: true, component: 'X', props: { a: 1 } })
    ui.closeModal(); expect(ui.modal).toEqual({ open: false, component: null, props: {} })
  })

  describe('toasts', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())
    it('se auto-eliminan tras su duración; duration 0 es persistente', () => {
      const ui = useUiStore()
      ui.addToast('hola', 'success', 1000)
      ui.addToast('fijo', 'info', 0)
      expect(ui.toasts).toHaveLength(2)
      vi.advanceTimersByTime(1000)
      expect(ui.toasts.map(t => t.message)).toEqual(['fijo'])
    })
  })
})

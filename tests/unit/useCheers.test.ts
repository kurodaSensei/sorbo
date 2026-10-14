import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const fs = vi.hoisted(() => ({ updateDoc: vi.fn() }))
vi.mock('firebase/firestore', () => ({
  deleteField: () => '__DELETE__',
  doc: (_db: any, c: string, id: string) => ({ path: `${c}/${id}` }),
  updateDoc: fs.updateDoc,
}))
import { useCheers } from '~/composables/useCheers'

const userId = ref<string | null>('me')
const toast = { error: vi.fn() }
const note = (cheers?: Record<string, true>) => ({ id: 't1', cheers }) as any

beforeEach(() => {
  vi.clearAllMocks()
  userId.value = 'me'
  vi.stubGlobal('useNuxtApp', () => ({ $db: {} }))
  vi.stubGlobal('useAuth', () => ({ userId }))
  vi.stubGlobal('useToast', () => toast)
})

describe('useCheers', () => {
  it('hasCheered / cheerCount', () => {
    const c = useCheers()
    expect(c.hasCheered(note())).toBe(false)
    expect(c.hasCheered(note({ me: true }))).toBe(true)
    expect(c.hasCheered(note({ other: true }))).toBe(false)
    expect(c.cheerCount(note())).toBe(0)
    expect(c.cheerCount(note({ a: true, b: true }))).toBe(2)
    userId.value = null
    expect(c.hasCheered(note({ me: true }))).toBe(false)
  })

  it('brindar: escribe solo cheers.<uid>=true y devuelve la nota actualizada sin mutar la original', async () => {
    const n = note({ other: true })
    const r = await useCheers().toggle(n)
    expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'tastings/t1' }, { 'cheers.me': true })
    expect(r.cheers).toEqual({ other: true, me: true })
    expect(n.cheers).toEqual({ other: true })
  })

  it('quitar: usa deleteField sobre mi entrada y conserva las de otros', async () => {
    const r = await useCheers().toggle(note({ me: true, other: true }))
    expect(fs.updateDoc).toHaveBeenCalledWith({ path: 'tastings/t1' }, { 'cheers.me': '__DELETE__' })
    expect(r.cheers).toEqual({ other: true })
  })

  it('nota sin cheers (undefined) funciona', async () => {
    const r = await useCheers().toggle(note())
    expect(r.cheers).toEqual({ me: true })
  })

  it('sin sesión no escribe y devuelve la misma nota', async () => {
    userId.value = null
    const n = note()
    expect(await useCheers().toggle(n)).toBe(n)
    expect(fs.updateDoc).not.toHaveBeenCalled()
  })

  it('si Firestore rechaza: toast de error y la nota original', async () => {
    fs.updateDoc.mockRejectedValue(new Error('permission-denied'))
    const n = note()
    expect(await useCheers().toggle(n)).toBe(n)
    expect(toast.error).toHaveBeenCalledWith('No se pudo brindar', expect.any(Error))
  })
})

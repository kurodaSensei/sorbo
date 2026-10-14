import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

const fs = vi.hoisted(() => ({
  setDoc: vi.fn(), updateDoc: vi.fn(), getDoc: vi.fn(), deleteDoc: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ path: 'col' })),
  doc: vi.fn((_db: any, _c?: string, id?: string) => ({ id: id ?? 'gen-id' })),
  getDocs: vi.fn(), query: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(),
  Timestamp: { now: () => ({ ts: 'now' }) },
  ...fs,
}))

import { useFirebase } from '~/composables/useFirebase'

const userId = ref<string | null>('u1')

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  userId.value = 'u1'
  vi.stubGlobal('useNuxtApp', () => ({ $db: {} }))
  vi.stubGlobal('useAuth', () => ({ userId }))
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.useRealTimers())

describe('useFirebase.create / settleOrQueue', () => {
  it('sin conexión (escritura que no resuelve) → create termina a los 2,5 s, no antes', async () => {
    fs.setDoc.mockReturnValue(new Promise(() => {}))
    let done = false
    const p = useFirebase().create('tastings', { a: 1 } as any).then((id) => { done = true; return id })
    await vi.advanceTimersByTimeAsync(2499)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await p).toBe('gen-id')
    expect(done).toBe(true)
  })

  it('servidor rápido → resuelve sin esperar el timeout', async () => {
    fs.setDoc.mockResolvedValue(undefined)
    await expect(useFirebase().create('tastings', {} as any)).resolves.toBe('gen-id')
  })

  it('rechazo rápido (reglas) se propaga', async () => {
    fs.setDoc.mockRejectedValue(new Error('permission-denied'))
    await expect(useFirebase().create('tastings', {} as any)).rejects.toThrow('permission-denied')
  })

  it('rechazo tardío (después de 2,5 s) no lanza unhandled rejection y se registra', async () => {
    let rej!: (e: Error) => void
    fs.setDoc.mockReturnValue(new Promise((_, r) => { rej = r }))
    const p = useFirebase().create('tastings', {} as any)
    await vi.advanceTimersByTimeAsync(2500)
    await p
    rej(new Error('late'))
    await vi.advanceTimersByTimeAsync(0)
    expect(console.error).toHaveBeenCalled()
  })

  it('escribe userId del auth y sobreescribe un userId ajeno en los datos', async () => {
    fs.setDoc.mockResolvedValue(undefined)
    await useFirebase().create('coffees', { name: 'x', userId: 'hacker' } as any)
    expect(fs.setDoc.mock.calls[0][1]).toMatchObject({ name: 'x', userId: 'u1' })
  })

  it('sin sesión lanza y no escribe', async () => {
    userId.value = null
    await expect(useFirebase().create('coffees', {} as any)).rejects.toThrow('No authenticated user')
    expect(fs.setDoc).not.toHaveBeenCalled()
  })
})

describe('useFirebase.update / remove', () => {
  const snap = (data: any) => ({ exists: () => !!data, data: () => data })

  it('update de doc ajeno → Unauthorized, sin escritura', async () => {
    fs.getDoc.mockResolvedValue(snap({ userId: 'other' }))
    await expect(useFirebase().update('coffees', 'c1', { name: 'x' })).rejects.toThrow('Unauthorized')
    expect(fs.updateDoc).not.toHaveBeenCalled()
  })

  it('update offline también se da por encolado a los 2,5 s', async () => {
    fs.getDoc.mockResolvedValue(snap({ userId: 'u1' }))
    fs.updateDoc.mockReturnValue(new Promise(() => {}))
    const p = useFirebase().update('coffees', 'c1', { name: 'x' })
    await vi.advanceTimersByTimeAsync(2500)
    await expect(p).resolves.toBeUndefined()
    expect(fs.updateDoc.mock.calls[0][1]).toMatchObject({ name: 'x' })
  })

  it('remove de doc propio borra; inexistente → error', async () => {
    fs.getDoc.mockResolvedValueOnce(snap({ userId: 'u1' }))
    fs.deleteDoc.mockResolvedValue(undefined)
    await useFirebase().remove('coffees', 'c1')
    expect(fs.deleteDoc).toHaveBeenCalledTimes(1)
    fs.getDoc.mockResolvedValueOnce(snap(null))
    await expect(useFirebase().remove('coffees', 'zz')).rejects.toThrow('Unauthorized')
  })

  it('remove offline también se da por encolado a los 2,5 s', async () => {
    fs.getDoc.mockResolvedValue(snap({ userId: 'u1' }))
    fs.deleteDoc.mockReturnValue(new Promise(() => {}))
    const p = useFirebase().remove('coffees', 'c1')
    await vi.advanceTimersByTimeAsync(2500)
    await expect(p).resolves.toBeUndefined()
  })
})

describe('useFirebase.getById (visibilidad en cliente)', () => {
  const snap = (data: any) => ({ exists: () => true, id: 'd', data: () => data })
  it.each([
    ['dueño', { userId: 'u1' }, true],
    ['compartido', { userId: 'o', sharedWith: ['u1'] }, true],
    ['comunidad', { userId: 'o', visibility: 'community' }, true],
    ['privado ajeno', { userId: 'o', visibility: 'private', sharedWith: [] }, false],
    ['amigos sin mí', { userId: 'o', visibility: 'friends', sharedWith: ['x'] }, false],
  ])('%s', async (_n, data, ok) => {
    fs.getDoc.mockResolvedValue(snap(data))
    const r = await useFirebase().getById('tastings', 'd')
    expect(!!r).toBe(ok)
  })
})

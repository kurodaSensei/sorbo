import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFirestoreStoreState } from '~/stores/factory'

interface Item { id: string, name: string }
const toast = { success: vi.fn(), error: vi.fn() }

function make(over: Partial<Record<string, any>> = {}) {
  const api = {
    fetchAll: vi.fn(async () => [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] as Item[]),
    fetchById: vi.fn(async (id: string) => ({ id, name: 'nuevo' }) as Item | null),
    create: vi.fn(async () => 'n1'),
    update: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    ...over,
  }
  const s = useFirestoreStoreState<Item>({
    api,
    messages: { created: 'creado', updated: 'actualizado', removed: 'eliminado', createFailed: 'cf', updateFailed: 'uf', removeFailed: 'rf' },
  })
  return { api, s }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('useToast', () => toast)
})

describe('stores/factory', () => {
  it('create: añade el nuevo al inicio sin recargar la colección', async () => {
    const { api, s } = make()
    await s.loadAll()
    api.fetchAll.mockClear()
    const id = await s.create({} as any)
    expect(id).toBe('n1')
    expect(s.list.value.map(x => x.id)).toEqual(['n1', 'a', 'b'])
    expect(api.fetchAll).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('creado')
    expect(s.loading.value).toBe(false)
  })

  it('create: si el id ya estaba no se duplica', async () => {
    const { s } = make({ create: vi.fn(async () => 'a') })
    await s.loadAll()
    await s.create({} as any)
    expect(s.list.value.filter(x => x.id === 'a')).toHaveLength(1)
    expect(s.list.value[0].id).toBe('a')
  })

  it('create: si fetchById falla/devuelve null recarga la colección', async () => {
    const { api, s } = make({ fetchById: vi.fn(async () => null) })
    await s.create({} as any)
    await Promise.resolve()
    expect(api.fetchAll).toHaveBeenCalledTimes(1)
  })

  it('create: error → toast, error, rethrow y loading false', async () => {
    const boom = new Error('boom')
    const { s } = make({ create: vi.fn(async () => { throw boom }) })
    await expect(s.create({} as any)).rejects.toBe(boom)
    expect(toast.error).toHaveBeenCalledWith('cf', boom)
    expect(s.error.value).toBe('boom')
    expect(s.loading.value).toBe(false)
    expect(s.list.value).toEqual([])
  })

  it('update: parcha lista y current sin releer', async () => {
    const { api, s } = make()
    await s.loadAll()
    await s.loadById('a')
    api.fetchAll.mockClear(); api.fetchById.mockClear()
    await s.update('a', { name: 'A2' })
    expect(s.list.value.find(x => x.id === 'a')!.name).toBe('A2')
    expect(s.list.value.find(x => x.id === 'b')!.name).toBe('B')
    expect(s.current.value!.name).toBe('A2')
    expect(api.fetchAll).not.toHaveBeenCalled()
    expect(api.fetchById).not.toHaveBeenCalled()
  })

  it('update: no toca current si es otro id; error no modifica la lista', async () => {
    const { s } = make()
    await s.loadAll(); await s.loadById('b')
    await s.update('a', { name: 'X' })
    expect(s.current.value!.name).toBe('nuevo')
    const f = make({ update: vi.fn(async () => { throw new Error('x') }) })
    await f.s.loadAll()
    await expect(f.s.update('a', { name: 'Z' })).rejects.toThrow('x')
    expect(f.s.list.value[0].name).toBe('A')
    expect(toast.error).toHaveBeenCalledWith('uf', expect.any(Error))
  })

  it('remove: quita de la lista y limpia current si coincide', async () => {
    const { s } = make()
    await s.loadAll(); await s.loadById('a')
    await s.remove('a')
    expect(s.list.value.map(x => x.id)).toEqual(['b'])
    expect(s.current.value).toBeNull()
    expect(toast.success).toHaveBeenCalledWith('eliminado')
  })

  it('remove: si falla, el elemento sigue en la lista', async () => {
    const { s } = make({ remove: vi.fn(async () => { throw new Error('no') }) })
    await s.loadAll()
    await expect(s.remove('a')).rejects.toThrow()
    expect(s.list.value).toHaveLength(2)
  })

  it('upsertLocal reemplaza y sube al inicio; reset limpia todo', async () => {
    const { s } = make()
    await s.loadAll()
    s.upsertLocal({ id: 'b', name: 'B2' })
    expect(s.list.value).toEqual([{ id: 'b', name: 'B2' }, { id: 'a', name: 'A' }])
    s.reset()
    expect(s.list.value).toEqual([])
  })

  it('loadAll con error deja el mensaje y apaga loading', async () => {
    const { s } = make({ fetchAll: vi.fn(async () => { throw new Error('offline') }) })
    await s.loadAll()
    expect(s.error.value).toBe('offline')
    expect(s.loading.value).toBe(false)
  })

  it('loadShared aplica sortShared; sin fetchShared no hace nada', async () => {
    const f = make({ fetchShared: vi.fn(async () => [{ id: '1', name: 'z' }, { id: '2', name: 'a' }]) })
    const s = useFirestoreStoreState<Item>({
      api: f.api as any,
      messages: { created: '', updated: '', removed: '', createFailed: '', updateFailed: '', removeFailed: '' },
      sortShared: items => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    })
    await s.loadShared()
    expect(s.sharedList.value.map(x => x.id)).toEqual(['2', '1'])
    const plain = make()
    await plain.s.loadShared()
    expect(plain.s.sharedList.value).toEqual([])
  })
})

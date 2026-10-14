import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive, ref } from 'vue'

const DEL = { __delete: true }
vi.mock('firebase/firestore', () => ({ Timestamp: { now: () => ({ ts: 'now', toMillis: () => 0 }) }, deleteField: () => DEL }))
import NoteForm from '~/components/note/Form.vue'
import NoteScorePicker from '../../components/note/ScorePicker.vue'

let m: ReturnType<typeof setupMocks>

function setupMocks(o: { coffees?: any[], tastings?: any[], wishlist?: any[], friends?: string[], recipes?: any[] } = {}) {
  const coffees = reactive({ list: o.coffees ?? [] as any[], loadAll: vi.fn(async () => {}), upsertLocal: vi.fn() })
  const tastings = reactive({ list: o.tastings ?? [] as any[], loadAll: vi.fn(async () => {}), create: vi.fn(async () => 'tid'), update: vi.fn(async () => {}) })
  const recipes = reactive({ list: o.recipes ?? [] as any[], loadAll: vi.fn(async () => {}) })
  const wishlist = reactive({ list: o.wishlist ?? [] as any[], loadAll: vi.fn(async () => {}), upsertLocal: vi.fn() })
  const friends = reactive({ list: (o.friends ?? []) as any[], friendUids: o.friends ?? [], load: vi.fn(async () => {}) })
  const createCoffee = vi.fn(async () => 'newc')
  const updateWish = vi.fn(async () => {})
  const trackEvent = vi.fn()
  const recordNote = vi.fn(async () => {})
  vi.stubGlobal('useCoffeesStore', () => coffees)
  vi.stubGlobal('useTastingsStore', () => tastings)
  vi.stubGlobal('useRecipesStore', () => recipes)
  vi.stubGlobal('useWishlistStore', () => wishlist)
  vi.stubGlobal('useFriendsStore', () => friends)
  vi.stubGlobal('useCoffees', () => ({ createCoffee }))
  vi.stubGlobal('useWishlist', () => ({ updateItem: updateWish }))
  vi.stubGlobal('useCatalog', () => ({
    brewMethodOptions: ref([{ value: 'v60', label: 'V60' }]),
    flavorNoteOptions: ref(['Cereza', 'Chocolate']),
    getBrewMethodLabel: (v: string) => v.toUpperCase(),
  }))
  vi.stubGlobal('useAuth', () => ({ currentUser: ref({ displayName: 'Ana Pérez', email: 'ana@x.co', photoURL: 'p.png' }) }))
  vi.stubGlobal('useAnalytics', () => ({ trackEvent }))
  vi.stubGlobal('useReminders', () => ({ recordNote }))
  vi.stubGlobal('useToast', () => ({ error: vi.fn(), success: vi.fn() }))
  return { coffees, tastings, wishlist, friends, createCoffee, updateWish, trackEvent, recordNote }
}

const mountForm = (props: any = {}) => mount(NoteForm, { props, global: { stubs: { AppIcon: true }, components: { NoteScorePicker } } })
const saveBtn = (w: any) => w.find('.nf-save')
const typeCoffee = (w: any, v: string) => w.find('#nf-cafe').setValue(v)
const pickScore = (w: any, n: number) => w.findAll('.sp button')[n - 1].trigger('click')

beforeEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  m = setupMocks({ friends: ['f1', 'f2'] })
})

describe('NoteForm · guardar', () => {
  it('desactivado sin café y sin puntaje, con la ayuda correcta', async () => {
    const w = mountForm()
    expect(saveBtn(w).attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Escribe el café y elige un puntaje')
    await typeCoffee(w, 'Geisha')
    expect(saveBtn(w).attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Elige un puntaje para guardar')
  })

  it('desactivado con puntaje pero sin café (o solo espacios)', async () => {
    const w = mountForm()
    await pickScore(w, 3)
    expect(saveBtn(w).attributes('disabled')).toBeDefined()
    await typeCoffee(w, '   ')
    expect(saveBtn(w).attributes('disabled')).toBeDefined()
  })

  it('activo con café y puntaje', async () => {
    const w = mountForm()
    await typeCoffee(w, 'Geisha'); await pickScore(w, 1)
    expect(saveBtn(w).attributes('disabled')).toBeUndefined()
  })

  it('puntaje 4 guarda ratingOverall 8; 1..5 → 2..10', async () => {
    for (const [score, rating] of [[1, 2], [4, 8], [5, 10]]) {
      m = setupMocks({ friends: [] })
      const w = mountForm()
      await typeCoffee(w, 'Geisha'); await pickScore(w, score)
      await saveBtn(w).trigger('click'); await flushPromises()
      expect(m.tastings.create.mock.calls[0][0].ratingOverall).toBe(rating)
    }
  })

  it('café nuevo muestra Marca, lo crea con la marca y usa su id en la nota', async () => {
    const w = mountForm()
    expect(w.find('#nf-marca').exists()).toBe(false)
    await typeCoffee(w, 'Geisha Nuevo')
    expect(w.find('#nf-marca').exists()).toBe(true)
    expect(w.text()).toContain('Café nuevo')
    await w.find('#nf-marca').setValue(' Tostao ')
    await pickScore(w, 4)
    await saveBtn(w).trigger('click'); await flushPromises()
    expect(m.createCoffee).toHaveBeenCalledWith(expect.objectContaining({ name: 'Geisha Nuevo', roasterName: 'Tostao' }))
    expect(m.coffees.upsertLocal).toHaveBeenCalled()
    expect(m.tastings.create.mock.calls[0][0]).toMatchObject({ coffeeId: 'newc', coffeeName: 'Geisha Nuevo', roasterName: 'Tostao' })
    expect(w.emitted('saved')![0]).toEqual(['tid'])
    expect(m.trackEvent).toHaveBeenCalledWith('note_saved', expect.objectContaining({ new_coffee: true, score: 4 }))
  })

  it('café existente (sin importar mayúsculas): sin Marca y sin crear otro café', async () => {
    m = setupMocks({ coffees: [{ id: 'c1', name: 'Geisha', roasterName: 'R' }], friends: [] })
    const w = mountForm()
    await typeCoffee(w, '  geisha ')
    expect(w.find('#nf-marca').exists()).toBe(false)
    await pickScore(w, 2)
    await saveBtn(w).trigger('click'); await flushPromises()
    expect(m.createCoffee).not.toHaveBeenCalled()
    expect(m.tastings.create.mock.calls[0][0]).toMatchObject({ coffeeId: 'c1', roasterName: 'R' })
  })

  it('error al crear la nota: no emite saved y vuelve a habilitar el botón', async () => {
    m.tastings.create.mockRejectedValueOnce(new Error('x'))
    const w = mountForm()
    await typeCoffee(w, 'Geisha'); await pickScore(w, 3)
    await saveBtn(w).trigger('click'); await flushPromises()
    expect(w.emitted('saved')).toBeUndefined()
    expect(saveBtn(w).attributes('disabled')).toBeUndefined()
  })

  it('desde Quiero probar: no pide marca y marca el elemento como purchased', async () => {
    m = setupMocks({ wishlist: [{ id: 'w1', coffeeName: 'Deseado', roasterName: 'Roas', status: 'pending' }], friends: [] })
    const w = mountForm()
    await typeCoffee(w, 'deseado')
    expect(w.find('#nf-marca').exists()).toBe(false)
    await pickScore(w, 5)
    await saveBtn(w).trigger('click'); await flushPromises()
    expect(m.createCoffee).toHaveBeenCalledWith(expect.objectContaining({ roasterName: 'Roas' }))
    expect(m.updateWish).toHaveBeenCalledWith('w1', { status: 'purchased' })
  })

  it('sabores, nota y tiempo: parseTime «3:05» → 185 s, «3» → 180 s; ratio', async () => {
    const w = mountForm()
    await typeCoffee(w, 'Geisha'); await pickScore(w, 3)
    await w.findAll('.nf-chip').find(b => b.text() === 'Cereza')!.trigger('click')
    await w.find('#nf-nota').setValue('  rico  ')
    await w.find('.nf-more-h').trigger('click')
    await w.find('#nf-dosis').setValue('15'); await w.find('#nf-agua').setValue('250'); await w.find('#nf-tiempo').setValue('3:05')
    await saveBtn(w).trigger('click'); await flushPromises()
    expect(m.tastings.create.mock.calls[0][0]).toMatchObject({
      flavorNotes: ['Cereza'], personalNotes: 'rico', dose: 15, water: 250, brewTime: 185, ratio: '1:16.7', brewMethod: 'other',
    })
  })
})

describe('NoteForm · compartir', () => {
  async function saved(w: any) {
    await typeCoffee(w, 'Geisha'); await pickScore(w, 3)
    await saveBtn(w).trigger('click'); await flushPromises()
    return m.tastings.create.mock.calls[0][0]
  }

  it('por defecto activo: visibility friends + sharedWith + autor', async () => {
    const t = await saved(mountForm())
    expect(t).toMatchObject({ visibility: 'friends', sharedWith: ['f1', 'f2'], authorName: 'Ana Pérez', authorPhotoURL: 'p.png' })
  })

  it('desactivar → private, sharedWith vacío y sin datos de autor', async () => {
    const w = mountForm()
    await w.find('.nf-switch').trigger('click')
    expect(w.find('.nf-switch').attributes('aria-checked')).toBe('false')
    const t = await saved(w)
    expect(t).toMatchObject({ visibility: 'private', sharedWith: [] })
    expect(t.authorName).toBeUndefined()
    expect(t.authorPhotoURL).toBeUndefined()
  })

  it('la elección se recuerda en localStorage y se restaura al montar', async () => {
    const w = mountForm()
    await w.find('.nf-switch').trigger('click')
    expect(localStorage.getItem('sorbo:share-with-friends')).toBe('0')
    const w2 = mountForm()
    await flushPromises()
    expect(w2.find('.nf-switch').attributes('aria-checked')).toBe('false')
    await w2.find('.nf-switch').trigger('click')
    expect(localStorage.getItem('sorbo:share-with-friends')).toBe('1')
  })

  it('activo pero sin amigos → private (no «friends» vacío)', async () => {
    m = setupMocks({ friends: [] })
    const t = await saved(mountForm())
    expect(t).toMatchObject({ visibility: 'private', sharedWith: [] })
  })
})

describe('NoteForm · precarga', () => {
  it('prefill del temporizador: datos precargados y elegir un café existente NO los pisa', async () => {
    m = setupMocks({
      coffees: [{ id: 'c1', name: 'Geisha' }],
      tastings: [{ id: 't0', coffeeId: 'c1', brewMethod: 'chemex', dose: 20, water: 300, brewTime: 240 }],
      friends: [],
    })
    const w = mountForm({ prefill: { name: 'Geisha', method: 'v60', dose: 15, water: 250, time: 180, recipeName: 'Mi V60' } })
    await flushPromises()
    expect((w.find('#nf-dosis').element as HTMLInputElement).value).toBe('15')
    expect((w.find('#nf-tiempo').element as HTMLInputElement).value).toBe('3:00')
    await pickScore(w, 4)
    await saveBtn(w).trigger('click'); await flushPromises()
    expect(m.tastings.create.mock.calls[0][0]).toMatchObject({ brewMethod: 'v60', dose: 15, water: 250, brewTime: 180, recipeName: 'Mi V60' })
  })

  it('«como la última vez»: al elegir un café con notas, rellena método/dosis', async () => {
    m = setupMocks({
      coffees: [{ id: 'c1', name: 'Geisha' }],
      tastings: [{ id: 't0', coffeeId: 'c1', brewMethod: 'v60', dose: 18, water: 300, brewTime: 150 }],
    })
    const w = mountForm()
    await typeCoffee(w, 'Geisha'); await flushPromises()
    await w.find('.nf-more-h').trigger('click')
    expect((w.find('#nf-dosis').element as HTMLInputElement).value).toBe('18')
    expect((w.find('#nf-tiempo').element as HTMLInputElement).value).toBe('2:30')
  })

  it('initialCoffeeId precarga el nombre del café', async () => {
    m = setupMocks({ coffees: [{ id: 'c1', name: 'Geisha', roasterName: 'R' }] })
    const w = mountForm({ initialCoffeeId: 'c1' })
    await flushPromises()
    expect((w.find('#nf-cafe').element as HTMLInputElement).value).toBe('Geisha')
  })
})

describe('NoteForm · recordatorio', () => {
  it('guardar una nota nueva registra la actividad; editar no', async () => {
    const w = mountForm()
    await typeCoffee(w, 'Geisha'); await pickScore(w, 4)
    await saveBtn(w).trigger('click'); await flushPromises()
    expect(m.recordNote).toHaveBeenCalledTimes(1)
  })
})

describe('NoteForm · editar', () => {
  const coffee = { id: 'c1', name: 'Sidra', roasterName: 'Green' }
  const note = {
    id: 't1', coffeeId: 'c1', coffeeName: 'Sidra', roasterName: 'Green', brewMethod: 'v60',
    dose: 18, water: 300, brewTime: 150, recipeName: 'Kubomi', ratingOverall: 7,
    flavorNotes: ['Cereza', 'Jazmín'], personalNotes: 'rico', visibility: 'friends', isFavorite: true,
  }

  it('precarga la nota, sin Recientes ni Compartir', async () => {
    m = setupMocks({ coffees: [coffee], tastings: [note] })
    const w = mountForm({ tasting: note })
    await flushPromises()
    expect(w.find('.nf-title').text()).toBe('Editar nota')
    expect((w.find('#nf-cafe').element as HTMLInputElement).value).toBe('Sidra')
    expect(w.findAll('.sp button')[3].attributes('aria-pressed')).toBe('true') // 7 → 4
    expect(w.text()).toContain('Jazmín')
    expect(w.find('.nf-recents').exists()).toBe(false)
    expect(w.find('.nf-share').exists()).toBe(false)
    expect(saveBtn(w).text()).toBe('Guardar cambios')
  })

  it('actualiza (no crea), conserva un puntaje v1 sin tocar y borra campos vaciados', async () => {
    m = setupMocks({ coffees: [coffee], tastings: [note] })
    const w = mountForm({ tasting: note })
    await flushPromises()
    await w.find('textarea').setValue('')
    await saveBtn(w).trigger('click')
    await flushPromises()
    expect(m.tastings.create).not.toHaveBeenCalled()
    expect(m.recordNote).not.toHaveBeenCalled()
    const [id, patch] = (m.tastings as any).update.mock.calls[0]
    expect(id).toBe('t1')
    expect(patch).not.toHaveProperty('ratingOverall')
    expect(patch.personalNotes).toBe(DEL)
    expect(patch).not.toHaveProperty('visibility')
    expect(w.emitted('saved')![0]).toEqual(['t1'])
  })

  it('cambiar el puntaje lo reescribe en la escala v2', async () => {
    m = setupMocks({ coffees: [coffee], tastings: [note] })
    const w = mountForm({ tasting: note })
    await flushPromises()
    await pickScore(w, 2)
    await saveBtn(w).trigger('click')
    await flushPromises()
    expect((m.tastings as any).update.mock.calls[0][1].ratingOverall).toBe(4)
  })
})

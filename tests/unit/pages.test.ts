import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import { ratingToScore } from '~/utils/score'
import CoffeesPage from '~/pages/app/coffees/index.vue'
import RecipesPage from '~/pages/app/recipes/index.vue'

const NoteCard = defineComponent({
  props: ['name'],
  setup: (p) => () => h('div', { class: 'card' }, p.name),
})
const stubs = { NoteCard, NuxtLink: { template: '<a><slot /></a>' }, AppIcon: true }
const ts = (ms: number) => ({ toMillis: () => ms })

const coffee = (id: string, name: string) => ({ id, name, roasterName: 'R' })
const tasting = (coffeeId: string, ratingOverall: number, extra: any = {}) => ({ id: `${coffeeId}-${ratingOverall}-${Math.random()}`, coffeeId, ratingOverall, ...extra })

function setup(lists: { coffees?: any[], tastings?: any[], wishlist?: any[], recipes?: any[], shared?: any[] }, query: any = {}) {
  const noop = () => Promise.resolve()
  vi.stubGlobal('definePageMeta', () => {})
  vi.stubGlobal('useRoute', () => ({ query }))
  vi.stubGlobal('useRouter', () => ({ back: vi.fn(), replace: vi.fn() }))
  vi.stubGlobal('useCoffeesStore', () => reactive({ list: lists.coffees ?? [], loading: false, loadAll: noop }))
  vi.stubGlobal('useTastingsStore', () => reactive({ list: lists.tastings ?? [], loadAll: noop }))
  vi.stubGlobal('useWishlistStore', () => reactive({ list: lists.wishlist ?? [], loadAll: noop }))
  vi.stubGlobal('useRecipesStore', () => reactive({ list: lists.recipes ?? [], sharedList: lists.shared ?? [], loadAll: noop, loadShared: noop }))
  vi.stubGlobal('useUiStore', () => ({ openNoteSheet: vi.fn() }))
  vi.stubGlobal('useCatalog', () => ({ getProcessLabel: (v: string) => v }))
}

beforeEach(() => vi.unstubAllGlobals())

describe('Mis cafés · filtro Favoritos', () => {
  const names = (w: any) => w.findAll('.card').map((c: any) => c.text())

  it('«Muy rico» (promedio score ≥ 4) o nota favorita; Recientes muestra todos', async () => {
    setup({
      coffees: [coffee('a', 'Alto'), coffee('b', 'Medio'), coffee('c', 'Fav'), coffee('d', 'SinNotas'), coffee('e', 'Borde')],
      tastings: [
        tasting('a', 8), tasting('a', 8),                 // prom. 8 → score 4
        tasting('b', 6),                                  // score 3
        tasting('c', 2, { isFavorite: true }),            // baja pero favorita
        tasting('e', 7),                                  // 7 → score 4 (redondea hacia arriba)
      ],
    }, { f: 'fav' })
    const w = mount(CoffeesPage, { global: { stubs } })
    await flushPromises()
    expect(names(w).sort()).toEqual(['Alto', 'Borde', 'Fav'])
    await w.findAll('.mc-chips button')[0].trigger('click')
    expect(names(w)).toHaveLength(5)
  })

  it('promedio exacto en el límite: (6+8)/2=7 → score 4 entra; (6+6+8)/3 no', async () => {
    expect(ratingToScore(7)).toBe(4)
    setup({
      coffees: [coffee('a', 'Entra'), coffee('b', 'NoEntra')],
      tastings: [tasting('a', 6), tasting('a', 8), tasting('b', 6), tasting('b', 6), tasting('b', 8)],
    }, { f: 'fav' })
    const w = mount(CoffeesPage, { global: { stubs } })
    await flushPromises()
    expect(names(w)).toEqual(['Entra'])
  })

  it('sin favoritos muestra el mensaje vacío; buscador filtra por nombre o marca', async () => {
    setup({ coffees: [coffee('a', 'Geisha')], tastings: [tasting('a', 4)] }, { f: 'fav' })
    const w = mount(CoffeesPage, { global: { stubs } })
    await flushPromises()
    expect(w.find('.mc-empty').text()).toContain('Aún no tienes favoritos')
    await w.findAll('.mc-chips button')[0].trigger('click')
    await w.find('input[type=search]').setValue('zzz')
    expect(w.find('.mc-empty').text()).toContain('Ningún café coincide')
    await w.find('input[type=search]').setValue('r')   // marca «R»
    expect(names(w)).toEqual(['Geisha'])
  })

  it('Quiero probar: solo pendientes y el contador los cuenta', async () => {
    setup({ wishlist: [
      { id: 'w1', coffeeName: 'Pendiente', status: 'pending' },
      { id: 'w2', coffeeName: 'Comprado', status: 'purchased' },
    ] }, { f: 'wish' })
    const w = mount(CoffeesPage, { global: { stubs } })
    await flushPromises()
    expect(names(w)).toEqual(['Pendiente'])
    expect(w.findAll('.mc-chips button')[2].text()).toContain('1')
  })
})

describe('Preparar · «Tu receta de siempre»', () => {
  const recipe = (id: string, name: string, ms: number) => ({ id, name, dose: 15, water: 250, createdAt: ts(ms), steps: [] })
  const usualName = (w: any) => w.find('.pr-hero-name').text()

  it('la más usada en las notas gana aunque sea más antigua', async () => {
    setup({
      recipes: [recipe('1', 'Nueva', 3000), recipe('2', 'Clásica', 1000)],
      tastings: [{ id: 't1', recipeName: 'Clásica' }, { id: 't2', recipeName: 'Clásica' }, { id: 't3', recipeName: 'Nueva' }],
    })
    const w = mount(RecipesPage, { global: { stubs } })
    await flushPromises()
    expect(usualName(w)).toBe('Clásica')
    expect(w.find('.pr-group .pr-row').text()).toContain('Nueva')
  })

  it('sin datos de uso: la más reciente', async () => {
    setup({ recipes: [recipe('1', 'Vieja', 1000), recipe('2', 'Reciente', 5000), recipe('3', 'Media', 3000)] })
    const w = mount(RecipesPage, { global: { stubs } })
    await flushPromises()
    expect(usualName(w)).toBe('Reciente')
  })

  it('empate de uso: desempata por la más reciente; usos de nombres que no existen se ignoran', async () => {
    setup({
      recipes: [recipe('1', 'A', 1000), recipe('2', 'B', 2000)],
      tastings: [{ id: 't1', recipeName: 'A' }, { id: 't2', recipeName: 'B' }, { id: 't3', recipeName: 'Fantasma' }, { id: 't4' }],
    })
    const w = mount(RecipesPage, { global: { stubs } })
    await flushPromises()
    expect(usualName(w)).toBe('B')
  })

  it('sin recetas invita a crear la primera; no revienta sin createdAt', async () => {
    setup({ recipes: [] })
    const w = mount(RecipesPage, { global: { stubs } })
    await flushPromises()
    expect(usualName(w)).toBe('Guarda tu primera receta')
    setup({ recipes: [{ id: '1', name: 'X', dose: 1, water: 2 }, { id: '2', name: 'Y', dose: 1, water: 2 }] })
    const w2 = mount(RecipesPage, { global: { stubs } })
    await flushPromises()
    expect(w2.find('.pr-hero-name').exists()).toBe(true)
  })

  it('el botón Empezar apunta al temporizador de esa receta', async () => {
    setup({ recipes: [recipe('r9', 'Solo', 1)] })
    const w = mount(RecipesPage, { global: { stubs: { ...stubs, NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } })
    await flushPromises()
    expect(w.find('.pr-btn').attributes('href')).toBe('/app/timer?receta=r9')
  })
})

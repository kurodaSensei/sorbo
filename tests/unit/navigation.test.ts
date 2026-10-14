import { describe, it, expect } from 'vitest'
import { APP_TABS, isTabActive } from '~/utils/navigation'

const active = (path: string) => APP_TABS.filter(t => isTabActive(t, path)).map(t => t.key)

describe('navigation', () => {
  it('4 pestañas en orden (el + es aparte)', () => {
    expect(APP_TABS.map(t => t.key)).toEqual(['diario', 'amigos', 'preparar', 'yo'])
  })
  it('rutas raíz', () => {
    expect(active('/app')).toEqual(['diario'])
    expect(active('/app/explore')).toEqual(['amigos'])
    expect(active('/app/recipes')).toEqual(['preparar'])
    expect(active('/app/yo')).toEqual(['yo'])
  })
  it('pantallas empujadas mantienen su pestaña', () => {
    expect(active('/app/tastings/abc')).toEqual(['diario'])
    expect(active('/app/friends')).toEqual(['amigos'])
    expect(active('/app/recipes/new')).toEqual(['preparar'])
    expect(active('/app/timer')).toEqual(['preparar'])
    expect(active('/app/vertido')).toEqual(['preparar'])
    expect(active('/app/coffees/xyz')).toEqual(['yo'])
    expect(active('/app/wishlist')).toEqual(['yo'])
    expect(active('/app/settings')).toEqual(['yo'])
    expect(active('/app/lists')).toEqual(['yo'])
  })
  it('«/app» no captura todo /app/*: sin coincidencias parciales de prefijo', () => {
    expect(active('/app/coffeesfoo')).toEqual([])
    expect(active('/app/yo2')).toEqual([])
    expect(active('/app/unknown')).toEqual([])
  })
  it('cada ruta cae en una sola pestaña', () => {
    for (const tab of APP_TABS) {
      for (const p of [tab.to, ...tab.match]) expect(active(p), p).toHaveLength(1)
    }
  })
})

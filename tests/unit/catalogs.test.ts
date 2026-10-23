import { describe, it, expect } from 'vitest'
import { groupNames, METHOD_LABELS, normalize, PROCESS_LABELS } from '../../functions/src/catalogs'
import { DEFAULT_BREW_METHOD_OPTIONS, DEFAULT_PROCESS_OPTIONS } from '../../utils/constants'

describe('admin · catálogos', () => {
  it('agrupa sin tildes, mayúsculas ni espacios de más', () => {
    expect(normalize('  El Café  de Andrés. ')).toBe('el cafe de andres')
    const [g, ...rest] = groupNames([
      { userId: 'a', text: 'El Café de Andrés', uses: 2 },
      { userId: 'b', text: 'El Café de Andrés', uses: 1 },
      { userId: 'c', text: 'el cafe  de andres', uses: 0 },
      { userId: 'e', text: 'El Cafe de Andres.', uses: 1 },
      { userId: 'd', text: 'Tostador B', uses: 1 },
      { userId: 'd', text: '   ', uses: 1 },
    ])
    expect(g).toMatchObject({ name: 'El Café de Andrés', people: 4, uses: 4 })
    expect(g.forms[0]).toEqual({ text: 'El Café de Andrés', people: 2 })
    expect(g.forms.map(f => f.text).sort()).toEqual(['El Cafe de Andres.', 'El Café de Andrés', 'el cafe de andres'])
    expect(rest).toEqual([{ name: 'Tostador B', forms: [{ text: 'Tostador B', people: 1 }], people: 1, uses: 1 }])
  })

  it('las etiquetas siguen iguales a las de la app', () => {
    expect(PROCESS_LABELS).toEqual(Object.fromEntries(DEFAULT_PROCESS_OPTIONS.map(o => [o.value, o.label])))
    expect(METHOD_LABELS).toEqual(Object.fromEntries(DEFAULT_BREW_METHOD_OPTIONS.map(o => [o.value, o.label])))
  })
})

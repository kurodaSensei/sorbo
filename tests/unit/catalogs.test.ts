import { describe, it, expect } from 'vitest'
import { activeCount, catalogItems } from '~/utils/catalogs'

describe('catalogs', () => {
  it('une, quita repetidos y ordena', () => {
    const r = catalogItems(['Sidra', 'Caturra'], ['Caturra', 'Anaerobio'])
    expect(r.map(i => i.value)).toEqual(['Anaerobio', 'Caturra', 'Sidra'])
  })
  it('respeta pares valor/etiqueta', () => {
    const r = catalogItems([{ value: 'v60', label: 'V60' }], [{ value: 'custom_x', label: 'Aeropress' }])
    expect(r.map(i => i.label)).toEqual(['Aeropress', 'V60'])
  })
  it('cuenta solo las activas', () => {
    expect(activeCount(catalogItems(['a', 'b', 'c']), ['b', 'zzz'])).toBe(2)
  })
})

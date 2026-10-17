import { describe, expect, it } from 'vitest'
import { processAfterName } from '../../utils/formatters'

describe('processAfterName', () => {
  it('omite el proceso si el nombre ya lo trae', () => {
    expect(processAfterName('Sidra Honey', 'honey')).toBe('')
    expect(processAfterName('Geisha Anaerobico', 'anaeróbico')).toBe('')
    expect(processAfterName('Caturra LAVADO', 'lavado')).toBe('')
  })

  it('lo conserva si no aparece como palabra completa', () => {
    expect(processAfterName('Sidra', 'honey')).toBe('honey')
    expect(processAfterName('Honeymoon Blend', 'honey')).toBe('honey')
  })

  it('devuelve vacío sin proceso', () => {
    expect(processAfterName('Sidra', '')).toBe('')
  })
})
